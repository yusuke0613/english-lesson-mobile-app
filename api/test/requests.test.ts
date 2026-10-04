import { env } from 'cloudflare:workers';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import worker from '../src/index';
import migration from '../migrations/0001_device_usage.sql?raw';
import { evaluation, replyInput, responseBody, token, wav } from './fixtures';

const bindings = () => ({ ...env, AI_ENABLED: 'true', OPENAI_API_KEY: 'test-provider-key', TRANSCRIPTION_MODEL: 'gpt-transcribe', TEXT_MODEL: 'gpt-6-luna', MONTHLY_LIMIT_MICRO_USD: '4000000' });
const db = () => (env as unknown as { DB: D1Database }).DB;
let outbound: ReturnType<typeof vi.spyOn>;
beforeEach(async () => {
  for (const query of migration.split(';').filter((q) => q.trim())) await db().prepare(query).run();
  await db().batch([db().prepare('DELETE FROM requests'), db().prepare('DELETE FROM devices')]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, '0')).join('');
  await db().prepare('INSERT INTO devices VALUES (?, ?, ?, 0)').bind('owner-phone', hash, Math.floor(Date.now() / 1000) + 86400).run();
  outbound = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    // Validate options with workerd's real Request constructor before faking the response.
    new Request(input, init);
    return Response.json(responseBody());
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

function request(body: unknown = replyInput, id = crypto.randomUUID(), bearer = token) {
  return new Request('https://coach.test/v1/replies', { method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', 'X-Request-Id': id }, body: JSON.stringify(body) });
}
function audioRequest(bytes = wav(), id = crypto.randomUUID()) {
  const form = new FormData();
  form.append('file', new File([bytes], 'answer.wav', { type: 'audio/wav' }));
  form.append('durationMs', '1000'); // A false client duration must not affect the limit.
  return new Request('https://coach.test/v1/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'X-Request-Id': id }, body: form });
}

test('missing authentication cannot start a paid request', async () => {
  const response = await worker.fetch(new Request('https://coach.test/v1/replies', { method: 'POST' }), env);
  expect(response.status).toBe(401);
  expect(outbound).not.toHaveBeenCalled();
});

test.each(['unknown', 'revoked', 'expired'])('%s token starts no paid request', async (kind) => {
  if (kind === 'revoked') await db().prepare('UPDATE devices SET revoked = 1').run();
  if (kind === 'expired') await db().prepare('UPDATE devices SET expires_at = 0').run();
  const response = await worker.fetch(request(replyInput, crypto.randomUUID(), kind === 'unknown' ? 'ec_' + 'x'.repeat(43) : token), bindings());
  expect(response.status).toBe(kind === 'unknown' ? 401 : 403);
  expect(outbound).not.toHaveBeenCalled();
});

test('valid reply is structured and only metadata is stored', async () => {
  const id = crypto.randomUUID();
  const response = await worker.fetch(request(replyInput, id), bindings());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ requestId: id, evaluation });
  const rows = await db().prepare('SELECT * FROM requests').all();
  expect(rows.results).toHaveLength(1);
  expect(JSON.stringify(rows)).not.toContain('Alex');
  expect(rows.results[0]).toMatchObject({ status: 'completed', device_id: 'owner-phone' });
});

test('same processing ID, including across month changes, never calls AI twice', async () => {
  const id = crypto.randomUUID();
  expect((await worker.fetch(request(replyInput, id), bindings())).status).toBe(200);
  await db().prepare("UPDATE requests SET month = '2000-01'").run();
  const response = await worker.fetch(request(replyInput, id), bindings());
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ code: 'RESULT_UNAVAILABLE', retryable: false });
  expect(outbound).toHaveBeenCalledTimes(1);
});

test('two concurrent requests with the same ID call the provider once', async () => {
  const id = crypto.randomUUID();
  const responses = await Promise.all([worker.fetch(request(replyInput, id), bindings()), worker.fetch(request(replyInput, id), bindings())]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(outbound).toHaveBeenCalledTimes(1);
});

test('concurrent reservations cannot both spend a budget for one request', async () => {
  let finish!: (value: Response) => void;
  outbound.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
  const limited = { ...bindings(), MONTHLY_LIMIT_MICRO_USD: '8500' };
  const first = worker.fetch(request(), limited);
  await vi.waitFor(() => expect(outbound).toHaveBeenCalledTimes(1));
  const second = await worker.fetch(request(), limited);
  expect(second.status).toBe(429);
  finish(Response.json(responseBody()));
  expect((await first).status).toBe(200);
});

test('exhausted budget and DB failure both prevent a provider call', async () => {
  expect((await worker.fetch(request(), { ...bindings(), MONTHLY_LIMIT_MICRO_USD: '1' })).status).toBe(429);
  const broken = { ...bindings(), DB: { prepare: () => { throw new Error('unavailable'); } } };
  expect((await worker.fetch(request(), broken as never)).status).toBe(503);
  expect(outbound).not.toHaveBeenCalled();
});

test.each([null, { ...replyInput, transcript: '' }, { ...replyInput, transcript: 'a'.repeat(501) }, { ...replyInput, questionId: 'unknown' }, { ...replyInput, context: Array(9).fill({}) }])('invalid request is rejected before reserving or paying', async (input) => {
  expect((await worker.fetch(request(input), bindings())).status).toBe(400);
  expect(outbound).not.toHaveBeenCalled();
  expect((await db().prepare('SELECT * FROM requests').all()).results).toHaveLength(0);
});

test.each(['network', 'bad-json', 'refusal', 'fabricated-correction'])('uncertain %s result keeps reservation and cannot auto-retry', async (mode) => {
  if (mode === 'network') outbound.mockRejectedValue(new Error('private provider message'));
  if (mode === 'bad-json') outbound.mockResolvedValue(new Response('invalid'));
  if (mode === 'refusal') outbound.mockResolvedValue(Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] }));
  if (mode === 'fabricated-correction') outbound.mockResolvedValue(Response.json(responseBody({ ...evaluation, correction: { original: 'I never said this', improved: 'Example', explanationJa: '例' } })));
  const id = crypto.randomUUID();
  const response = await worker.fetch(request(replyInput, id), bindings());
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain('private provider message');
  expect((await worker.fetch(request(replyInput, id), bindings())).status).toBe(409);
  expect(outbound).toHaveBeenCalledTimes(1);
  expect(await db().prepare('SELECT status, charged_micro_usd FROM requests WHERE id = ?').bind(id).first()).toEqual({ status: 'unknown', charged_micro_usd: null });
});

test('settlement failure keeps an uncertain reservation without exposing the result', async () => {
  outbound.mockImplementation(async () => {
    await db().exec("CREATE TRIGGER fail_settle BEFORE UPDATE ON requests WHEN NEW.status = 'completed' BEGIN SELECT RAISE(ABORT, 'settlement failed'); END;");
    return Response.json(responseBody());
  });
  const id = crypto.randomUUID();
  const response = await worker.fetch(request(replyInput, id), bindings());
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: 'RESULT_UNAVAILABLE', retryable: false });
  expect((await worker.fetch(request(replyInput, id), bindings())).status).toBe(409);
  expect(outbound).toHaveBeenCalledTimes(1);
  await db().exec('DROP TRIGGER fail_settle');
});

test.each([
  { status: 307, upstreamCode: 'redirect', code: 'PROVIDER_SERVICE_ERROR' },
  { status: 401, upstreamCode: 'invalid_api_key', code: 'PROVIDER_AUTH_FAILED' },
  { status: 403, upstreamCode: 'permission_denied', code: 'PROVIDER_ACCESS_DENIED' },
  { status: 400, upstreamCode: 'invalid_request_error', code: 'PROVIDER_REQUEST_REJECTED' },
  { status: 404, upstreamCode: 'model_not_found', code: 'PROVIDER_REQUEST_REJECTED' },
  { status: 429, upstreamCode: 'credit_balance_exhausted', code: 'PROVIDER_BILLING_LIMIT' },
  { status: 429, upstreamCode: 'insufficient_quota', code: 'PROVIDER_BILLING_LIMIT' },
  { status: 429, upstreamCode: 'project_spend_limit_exceeded', code: 'PROVIDER_BILLING_LIMIT' },
  { status: 429, upstreamCode: 'slow_down', code: 'PROVIDER_RATE_LIMIT' },
  { status: 500, upstreamCode: 'private_unknown_code', code: 'PROVIDER_SERVICE_ERROR' },
])('classifies upstream $status / $upstreamCode without disclosing details or retrying', async ({ status, upstreamCode, code }) => {
  outbound.mockResolvedValue(Response.json({ error: { code: upstreamCode, message: 'private provider message with credentials' } }, { status }));
  const id = crypto.randomUUID();
  const response = await worker.fetch(request(replyInput, id), bindings());
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ requestId: id, stage: 'reply', code, retryable: false });
  expect((await worker.fetch(request(replyInput, id), bindings())).status).toBe(409);
  expect(outbound).toHaveBeenCalledTimes(1);
  expect(await db().prepare('SELECT status, charged_micro_usd FROM requests WHERE id = ?').bind(id).first()).toEqual({ status: 'unknown', charged_micro_usd: null });
});

test('provider transport and malformed successful response have distinct safe errors', async () => {
  outbound.mockRejectedValueOnce(new Error('private network details'));
  const network = await worker.fetch(request(), bindings());
  expect(await network.json()).toMatchObject({ code: 'PROVIDER_CONNECTION_FAILED', retryable: false });
  outbound.mockResolvedValueOnce(new Response('not json', { status: 200 }));
  const malformed = await worker.fetch(request(), bindings());
  expect(await malformed.json()).toMatchObject({ code: 'PROVIDER_INVALID_RESPONSE', retryable: false });
  outbound.mockResolvedValueOnce(Response.json({ unexpected: 'private output' }));
  const invalid = await worker.fetch(request(), bindings());
  expect(await invalid.json()).toMatchObject({ code: 'PROVIDER_INVALID_RESPONSE', retryable: false });
  expect(outbound).toHaveBeenCalledTimes(3);
});

test('PCM duration is verified from bytes, and the transcript is returned', async () => {
  outbound.mockResolvedValue(Response.json({ text: replyInput.transcript }));
  const response = await worker.fetch(audioRequest(), bindings());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ transcript: replyInput.transcript });
});

test.each([wav(91), new Uint8Array(5_000_001), new Uint8Array([1, 2, 3]), wav(0.5)])('invalid audio never reaches the provider', async (bytes) => {
  expect([400, 413, 415]).toContain((await worker.fetch(audioRequest(bytes), bindings())).status);
  expect(outbound).not.toHaveBeenCalled();
});

test('AI is disabled by default even with valid authentication', async () => {
  expect((await worker.fetch(request(), { ...bindings(), AI_ENABLED: 'false' })).status).toBe(503);
  expect(outbound).not.toHaveBeenCalled();
});

function summaryRequest(attempts: unknown[]) {
  return new Request('https://coach.test/v1/summaries', {
    method: 'POST', headers: request().headers,
    body: JSON.stringify({ lessonId: 'self-introduction', sessionId: crypto.randomUUID(), ended: 'interrupted', attempts }),
  });
}

test('provider body limits are checked before any budget is reserved', async () => {
  const long = 'a'.repeat(470) + 'あ'.repeat(30);
  const attempts = Array.from({ length: 16 }, () => ({
    id: crypto.randomUUID(), questionId: 'intro-work', transcript: long,
    evaluation: { outcome: 'answered', reasonJa: long, replyEn: long, correction: { original: long, improved: long, explanationJa: long } },
  }));
  const input = summaryRequest(attempts);
  expect((await input.clone().arrayBuffer()).byteLength).toBeLessThan(64000);
  const response = await worker.fetch(input, bindings());
  expect(response.status).toBe(413);
  expect(outbound).not.toHaveBeenCalled();
  expect((await db().prepare('SELECT * FROM requests').all()).results).toHaveLength(0);
});

test('duplicate summary attempt IDs are rejected before reserving or paying', async () => {
  const attempt = { id: crypto.randomUUID(), questionId: 'intro-work', transcript: 'I work in IT.', evaluation };
  const response = await worker.fetch(summaryRequest([attempt, attempt]), bindings());
  expect(response.status).toBe(400);
  expect(outbound).not.toHaveBeenCalled();
  expect((await db().prepare('SELECT * FROM requests').all()).results).toHaveLength(0);
});

test('an upload crossing midnight is charged to the month when paid work starts', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-30T14:59:59Z'));
  await db().prepare('UPDATE devices SET expires_at = ?').bind(Math.floor(Date.now() / 1000) + 86400).run();
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      vi.setSystemTime(new Date('2026-09-30T15:00:01Z'));
      controller.enqueue(new TextEncoder().encode(JSON.stringify(replyInput)));
      controller.close();
    },
  }, { highWaterMark: 0 });
  const input = new Request('https://coach.test/v1/replies', { method: 'POST', headers: request().headers, body });
  expect((await worker.fetch(input, bindings())).status).toBe(200);
  expect(await db().prepare('SELECT month FROM requests').first()).toEqual({ month: '2026-10' });
});
