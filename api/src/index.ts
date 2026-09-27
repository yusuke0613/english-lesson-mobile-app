import { z } from 'zod';
import { authenticate } from './auth';
import { pcmDuration } from './audio';
import { markUnknown, reserveUsage, settleUsage } from './budget';
import { replyInputSchema, summaryInputSchema, requestId as requestIdSchema } from './schemas';
import * as provider from './provider';
import { ApiError, type Env, type Stage } from './types';

const routes: Record<string, Stage> = { '/v1/transcriptions': 'transcription', '/v1/replies': 'reply', '/v1/summaries': 'summary' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function readBody(request: Request, limit: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('INVALID_INPUT', 400);
  const parts: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new ApiError('INPUT_TOO_LARGE', 413); }
    parts.push(value);
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.byteLength; }
  return result;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const stage = routes[new URL(request.url).pathname];
    const parsedId = requestIdSchema.safeParse(request.headers.get('X-Request-Id'));
    const requestId = parsedId.success ? parsedId.data : null;
    let reserved = false;
    let providerSucceeded = false;
    let db: D1DatabaseSession | undefined;
    try {
      if (request.method !== 'POST' || !stage) throw new ApiError('NOT_FOUND', 404);
      if (!request.headers.get('Authorization')) throw new ApiError('UNAUTHORIZED', 401);
      db = env.DB.withSession('first-primary');
      const now = new Date();
      const deviceId = await authenticate(request.headers.get('Authorization'), db, Math.floor(now.getTime() / 1000));
      if (env.AI_ENABLED !== 'true' || !env.OPENAI_API_KEY) throw new ApiError('AI_NOT_CONFIGURED', 503);
      const limit = Number(env.MONTHLY_LIMIT_MICRO_USD);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 4000000 || env.TEXT_MODEL !== 'gpt-6-luna' || env.TRANSCRIPTION_MODEL !== 'gpt-transcribe') throw new ApiError('INVALID_SERVER_CONFIG', 503);
      if (!requestId) throw new ApiError('INVALID_REQUEST_ID', 400);

      let run: () => Promise<{ data: object; cost: number }>;
      if (stage === 'transcription') {
        const bytes = await readBody(request, 5_020_000);
        const form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('Content-Type') ?? '' } }).formData();
        const file = form.get('file');
        if (!(file instanceof File)) throw new ApiError('INVALID_AUDIO', 400);
        const durationMs = pcmDuration(new Uint8Array(await file.arrayBuffer()));
        run = () => provider.transcribe(file, durationMs, env);
      } else {
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new ApiError('INVALID_INPUT', 400);
        const data = JSON.parse(new TextDecoder().decode(await readBody(request, 64000))) as unknown;
        if (stage === 'reply') { const input = replyInputSchema.parse(data); run = provider.prepareReply(input, env); }
        else { const input = summaryInputSchema.parse(data); run = provider.prepareSummary(input, env); }
      }
      await reserveUsage(db, deviceId, requestId, stage, new Date(), limit);
      reserved = true;
      const result = await run();
      providerSucceeded = true;
      await settleUsage(db, requestId, result.cost);
      return json({ requestId, ...result.data, usage: { estimatedMicroUsd: result.cost } });
    } catch (error) {
      if (reserved && db && requestId) { try { await markUnknown(db, requestId); } catch { /* Keep the original reservation; never release an uncertain charge. */ } }
      let fault: ApiError;
      if (providerSucceeded) fault = new ApiError('RESULT_UNAVAILABLE', 503);
      else if (error instanceof ApiError) fault = error;
      else if (reserved) fault = new ApiError('PROVIDER_RESULT_UNKNOWN', 502);
      else if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError && /form|multipart/i.test(error.message)) fault = new ApiError('INVALID_INPUT', 400);
      else fault = new ApiError('SERVICE_UNAVAILABLE', 503);
      return json({ requestId, stage: stage ?? null, code: fault.code, retryable: fault.retryable }, fault.status);
    }
  },
};
