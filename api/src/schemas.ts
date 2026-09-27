import { z } from 'zod';

export const questionId = z.enum(['intro-name', 'intro-work', 'intro-work-check', 'intro-work-review']);
export const requestId = z.uuid();
const shortText = z.string().trim().min(1).max(500);
export const supportSchema = z.strictObject({
  englishViewed: z.boolean(), meaningViewed: z.boolean(), templateViewed: z.boolean(),
  examplePlayed: z.boolean(), playCount: z.number().int().min(0).max(100), slowPlayed: z.boolean(),
});
export const evaluationSchema = z.strictObject({
  outcome: z.enum(['answered', 'retry', 'unassessed']), reasonJa: shortText, replyEn: shortText,
  correction: z.strictObject({ original: shortText, improved: shortText, explanationJa: shortText }).nullable(),
});
export const replyInputSchema = z.strictObject({
  lessonId: z.literal('self-introduction'), questionId, transcript: shortText, support: supportSchema,
  context: z.array(z.strictObject({ questionId, transcript: shortText, replyEn: shortText })).max(8),
});
export const summaryInputSchema = z.strictObject({
  lessonId: z.literal('self-introduction'), sessionId: z.uuid(), ended: z.enum(['completed', 'interrupted']),
  attempts: z.array(z.strictObject({ id: z.uuid(), questionId, transcript: shortText, evaluation: evaluationSchema })).min(1).max(16)
    .refine((attempts) => new Set(attempts.map((attempt) => attempt.id)).size === attempts.length, 'Duplicate attempt'),
});
export const summarySchema = z.strictObject({
  achievementsJa: z.array(shortText).max(3),
  phrases: z.array(z.strictObject({ english: shortText, meaningJa: shortText, usageJa: shortText, exampleEn: shortText, sourceAttemptIds: z.array(z.uuid()).min(1).max(16) })).max(3),
  rewrites: z.array(z.strictObject({ attemptId: z.uuid(), original: shortText, improved: shortText, explanationJa: shortText })).max(2),
});
export type ReplyInput = z.infer<typeof replyInputSchema>;
export type SummaryInput = z.infer<typeof summaryInputSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
export type Summary = z.infer<typeof summarySchema>;

export function verifyEvaluation(value: unknown, input: ReplyInput): Evaluation {
  const result = evaluationSchema.parse(value);
  if (result.correction && result.correction.original !== input.transcript) throw new Error('Ungrounded correction');
  if (/[?？]/.test(result.replyEn)) throw new Error('Questions are selected by the lesson');
  return result;
}
export function verifySummary(value: unknown, input: SummaryInput): Summary {
  const result = summarySchema.parse(value);
  const attempts = new Map(input.attempts.map((a) => [a.id, a]));
  if (attempts.size !== input.attempts.length) throw new Error('Duplicate attempt');
  for (const rewrite of result.rewrites) if (attempts.get(rewrite.attemptId)?.transcript !== rewrite.original) throw new Error('Ungrounded rewrite');
  for (const phrase of result.phrases) for (const id of phrase.sourceAttemptIds) if (!attempts.has(id)) throw new Error('Unknown source');
  return result;
}
