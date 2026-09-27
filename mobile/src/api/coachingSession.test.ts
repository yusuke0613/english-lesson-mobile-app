import { CoachingSession } from './coachingSession';
const recording = { uri: 'file:///answer.wav', durationMs: 3000, sizeBytes: 96044, mimeType: 'audio/wav' };
const support = { englishViewed: true, meaningViewed: true, templateViewed: false, examplePlayed: false, playCount: 1, slowPlayed: false };
const evaluation = { outcome: 'answered' as const, reasonJa: '名前を伝えられました', replyEn: 'Nice to meet you.', correction: null };
function setup() {
  const order: string[] = [];
  const client = {
    transcribe: jest.fn(async () => ({ requestId: 'transcription-id', transcript: 'You can call me Alex.', usage: { estimatedMicroUsd: 1 } })),
    reply: jest.fn(async () => { order.push('reply'); return { requestId: 'reply-id', evaluation, usage: { estimatedMicroUsd: 1 } }; }),
    summarize: jest.fn(),
  };
  const discard = jest.fn(async () => true);
  const persist = jest.fn(async () => { order.push('persist'); });
  let n = 0;
  return { client, discard, persist, order, session: new CoachingSession(client, () => String(++n), discard, persist) };
}
test('one submission saves the transcript before requesting a reply and then discards audio', async () => {
  const { client, session, discard, order } = setup();
  await Promise.all([session.submit(recording, 'intro-name', support), session.submit(recording, 'intro-name', support)]);
  expect(client.transcribe).toHaveBeenCalledTimes(1);
  expect(client.reply).toHaveBeenCalledTimes(1);
  expect(order).toEqual(['persist', 'reply']);
  expect(client.reply).toHaveBeenCalledWith(expect.objectContaining({ support }), '2');
  expect(discard).toHaveBeenCalledTimes(1);
  expect(session.getSnapshot()).toMatchObject({ status: 'feedback', transcript: 'You can call me Alex.', evaluation });
});
test('reply failure retains the transcript and recording without retrying', async () => {
  const { client, session, discard } = setup();
  client.reply.mockRejectedValue(new Error('unknown'));
  await session.submit(recording, 'intro-name', support);
  await session.submit(recording, 'intro-name', support);
  expect(client.reply).toHaveBeenCalledTimes(1);
  expect(session.getSnapshot()).toMatchObject({ status: 'error', transcript: 'You can call me Alex.' });
  expect(discard).not.toHaveBeenCalled();
});
