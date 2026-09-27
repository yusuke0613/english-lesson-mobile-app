import { createCoachClient } from './coachClient';
import { replySchema } from './contracts';
import contract from '../../../docs/fixtures/coach-reply.json';
const id = 'b8c611d6-f85b-4774-a8cf-cf2910248fb5';
const token = 'ec_' + 'a'.repeat(43);
const recording = { uri: 'file:///answer.wav', durationMs: 3000, sizeBytes: 96044, mimeType: 'audio/wav' };
test('shared reply fixture matches the mobile contract', () => { expect(replySchema.parse(contract.response)).toEqual(contract.response); });
function setup() {
  const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ requestId: id, transcript: 'You can call me Alex.', usage: { estimatedMicroUsd: 4500 } }), { status: 200 }));
  const client = createCoachClient({ baseUrl: 'https://coach.example.com', getToken: async () => token, fetchImpl, makeAudioBody: () => 'fake fixture' });
  return { client, fetchImpl };
}
test('sends the device token once and validates matching request ID', async () => {
  const { client, fetchImpl } = setup();
  expect(await client.transcribe(recording, id)).toMatchObject({ transcript: 'You can call me Alex.' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledWith('https://coach.example.com/v1/transcriptions', expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${token}`, 'X-Request-Id': id }) }));
});
test('network uncertainty is never automatically retried', async () => {
  const { client, fetchImpl } = setup();
  fetchImpl.mockRejectedValueOnce(new Error('offline'));
  await expect(client.transcribe(recording, id)).rejects.toMatchObject({ code: 'RESULT_UNKNOWN', retryable: false });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
test('a different response ID is rejected rather than used for this recording', async () => {
  const { client, fetchImpl } = setup();
  fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify({ requestId: 'b8c611d6-f85b-4774-a8cf-cf2910248fb6', transcript: 'Wrong turn', usage: { estimatedMicroUsd: 10 } }), { status: 200 }));
  await expect(client.transcribe(recording, id)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
test('plain HTTP and an OpenAI key cannot be used as device credentials', async () => {
  const { fetchImpl } = setup();
  const client = createCoachClient({ baseUrl: 'http://coach.example.com', getToken: async () => token, fetchImpl });
  await expect(client.transcribe(recording, id)).rejects.toMatchObject({ code: 'CONFIG_REQUIRED' });
  const wrongToken = createCoachClient({ baseUrl: 'https://coach.example.com', getToken: async () => 'sk-not-a-device-token', fetchImpl });
  await expect(wrongToken.transcribe(recording, id)).rejects.toMatchObject({ code: 'CONFIG_REQUIRED' });
  expect(fetchImpl).not.toHaveBeenCalled();
});
test('server budget stop is preserved without retry', async () => {
  const { client, fetchImpl } = setup();
  fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify({ requestId: id, stage: 'transcription', code: 'BUDGET_EXCEEDED', retryable: false }), { status: 429 }));
  await expect(client.transcribe(recording, id)).rejects.toMatchObject({ code: 'BUDGET_EXCEEDED', retryable: false });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
