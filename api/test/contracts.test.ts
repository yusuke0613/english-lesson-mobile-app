import { expect, test } from 'vitest';
import { billingMonth } from '../src/budget';
import { pcmDuration } from '../src/audio';
import { replyInputSchema, summaryInputSchema, verifyEvaluation, verifySummary } from '../src/schemas';
import contract from '../../docs/fixtures/coach-reply.json';
import { evaluation, wav } from './fixtures';

test('shared reply fixture matches the server contract', () => {
  expect(verifyEvaluation(contract.response.evaluation, replyInputSchema.parse(contract.request))).toEqual(contract.response.evaluation);
});

test('billing months use server time in Tokyo', () => {
  expect(billingMonth(new Date('2026-09-30T14:59:59Z'))).toBe('2026-09');
  expect(billingMonth(new Date('2026-09-30T15:00:00Z'))).toBe('2026-10');
});
test('PCM sample format cannot inflate the duration calculation', () => {
  const bytes = wav();
  new DataView(bytes.buffer).setUint32(28, 1, true);
  expect(() => pcmDuration(bytes)).toThrow();
  expect(pcmDuration(wav(90))).toBe(90000);
});

test('PCM only accepts audio chunks and inert padding', () => {
  const base = wav();
  const withChunk = (kind: string) => {
    const result = new Uint8Array(base.length + 12);
    result.set(base);
    result.set(new TextEncoder().encode(kind), base.length);
    const view = new DataView(result.buffer);
    view.setUint32(4, result.length - 8, true);
    view.setUint32(base.length + 4, 4, true);
    return result;
  };
  expect(pcmDuration(withChunk('JUNK'))).toBe(3000);
  expect(pcmDuration(withChunk('FLLR'))).toBe(3000);
  expect(() => pcmDuration(withChunk('LIST'))).toThrow();
  expect(() => pcmDuration(withChunk('slnt'))).toThrow();
});
test('summary limits and citations reject invented learning history', () => {
  const id = crypto.randomUUID();
  const input = summaryInputSchema.parse({ lessonId: 'self-introduction', sessionId: crypto.randomUUID(), ended: 'interrupted', attempts: [{ id, questionId: 'intro-work', transcript: 'I work in IT.', evaluation }] });
  const valid = { achievementsJa: ['仕事を伝えた'], phrases: [], rewrites: [] };
  expect(verifySummary(valid, input)).toEqual(valid);
  expect(() => verifySummary({ ...valid, rewrites: [{ attemptId: id, original: 'Not said', improved: 'I work in IT.', explanationJa: '修正' }] }, input)).toThrow();
  expect(() => verifySummary({ ...valid, phrases: Array(4).fill({ english: 'I work in IT.', meaningJa: 'ITの仕事', usageJa: '自己紹介', exampleEn: 'I work in IT.', sourceAttemptIds: [id] }) }, input)).toThrow();
  expect(() => verifySummary({ ...valid, rewrites: Array(3).fill({ attemptId: id, original: 'I work in IT.', improved: 'I work in technology.', explanationJa: '別表現' }) }, input)).toThrow();
  expect(() => summaryInputSchema.parse({ ...input, attempts: Array(17).fill(input.attempts[0]) })).toThrow();
});
