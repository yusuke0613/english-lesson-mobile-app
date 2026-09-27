import { z } from 'zod';
import { Recording, validateRecording } from '../audio/recorder';
import { replySchema, transcriptSchema, summarySchema, ReplyInput, SummaryInput } from './contracts';

export class CoachError extends Error {
  readonly retryable = false;
  constructor(public code: string) { super(code); }
}
export const isDeviceToken = (token: string) => /^ec_[A-Za-z0-9_-]{43}$/.test(token);
type Options = { baseUrl: string; getToken(): Promise<string | null>; fetchImpl?: typeof fetch; makeAudioBody?: (recording: Recording) => BodyInit };
function audioBody(recording: Recording): FormData {
  const form = new FormData();
  form.append('file', { uri: recording.uri, name: 'answer.wav', type: 'audio/wav' } as unknown as Blob);
  return form;
}
export function createCoachClient(options: Options) {
  async function send<T>(path: string, id: string, body: BodyInit, schema: z.ZodType<T>, isJson: boolean): Promise<T> {
    let base: URL;
    try { base = new URL(options.baseUrl); } catch { throw new CoachError('CONFIG_REQUIRED'); }
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !z.uuid().safeParse(id).success) throw new CoachError('CONFIG_REQUIRED');
    const token = await options.getToken();
    if (!token || !isDeviceToken(token)) throw new CoachError('CONFIG_REQUIRED');
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 25000);
    try {
      const response = await (options.fetchImpl ?? fetch)(`${base.origin}${path}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'X-Request-Id': id, ...(isJson ? { 'Content-Type': 'application/json' } : {}) }, body, signal: abort.signal, redirect: 'error',
      });
      const value: unknown = await response.json();
      if (!response.ok) {
        const error = z.object({ code: z.string().max(80) }).safeParse(value);
        throw new CoachError(error.success ? error.data.code : 'INVALID_RESPONSE');
      }
      const parsed = schema.safeParse(value);
      if (!parsed.success || (parsed.data as { requestId: string }).requestId !== id) throw new CoachError('INVALID_RESPONSE');
      return parsed.data;
    } catch (error) {
      if (error instanceof CoachError) throw error;
      throw new CoachError('RESULT_UNKNOWN');
    } finally { clearTimeout(timer); }
  }
  return {
    transcribe(recording: Recording, id: string) {
      if (validateRecording(recording) || recording.mimeType !== 'audio/wav') return Promise.reject(new CoachError('INVALID_AUDIO'));
      return send('/v1/transcriptions', id, (options.makeAudioBody ?? audioBody)(recording), transcriptSchema, false);
    },
    reply(input: ReplyInput, id: string) { return send('/v1/replies', id, JSON.stringify(input), replySchema, true); },
    summarize(input: SummaryInput, id: string) { return send('/v1/summaries', id, JSON.stringify(input), summarySchema, true); },
  };
}
export type CoachClient = ReturnType<typeof createCoachClient>;
