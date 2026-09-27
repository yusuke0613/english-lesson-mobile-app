import { z } from 'zod';
import { QuestionId, SupportUsage } from '../lesson/types';
const text = z.string().trim().min(1).max(500);
export const evaluationSchema = z.strictObject({
  outcome: z.enum(['answered', 'retry', 'unassessed']), reasonJa: text, replyEn: text,
  correction: z.strictObject({ original: text, improved: text, explanationJa: text }).nullable(),
});
const envelope = { requestId: z.uuid(), usage: z.strictObject({ estimatedMicroUsd: z.number().int().nonnegative() }) };
export const transcriptSchema = z.strictObject({ ...envelope, transcript: text });
export const replySchema = z.strictObject({ ...envelope, evaluation: evaluationSchema });
export const summarySchema = z.strictObject({ ...envelope, sessionId: z.uuid(), summary: z.strictObject({
  achievementsJa: z.array(text).max(3),
  phrases: z.array(z.strictObject({ english: text, meaningJa: text, usageJa: text, exampleEn: text, sourceAttemptIds: z.array(z.uuid()).min(1).max(16) })).max(3),
  rewrites: z.array(z.strictObject({ attemptId: z.uuid(), original: text, improved: text, explanationJa: text })).max(2),
}) });
export type Evaluation = z.infer<typeof evaluationSchema>;
export type ReplyInput = { lessonId: 'self-introduction'; questionId: QuestionId; transcript: string; support: SupportUsage; context: { questionId: QuestionId; transcript: string; replyEn: string }[] };
export type SummaryInput = { lessonId: 'self-introduction'; sessionId: string; ended: 'completed' | 'interrupted'; attempts: { id: string; questionId: QuestionId; transcript: string; evaluation: Evaluation }[] };
