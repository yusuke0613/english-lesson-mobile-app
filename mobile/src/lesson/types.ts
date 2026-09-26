export type QuestionId = 'intro-name' | 'intro-work' | 'intro-work-check' | 'intro-work-review';
export type SupportKind = 'english' | 'meaning' | 'template';
export type VisibleSupport = Record<SupportKind, boolean>;
export type Question = { id: QuestionId; english: string; meaningJa: string; intentJa: string; pattern: string; example: string; exampleJa: string };
export type SupportUsage = { englishViewed: boolean; meaningViewed: boolean; templateViewed: boolean; examplePlayed: boolean; playCount: number; slowPlayed: boolean };
export type Attempt = { id: string; questionId: QuestionId; transcript: string };
export type LessonState = {
  sessionId: string; startedAt: string;
  phase: 'prepare' | 'practice' | 'check' | 'review' | 'summary';
  questionId: QuestionId; visibleSupport: VisibleSupport; support: SupportUsage;
  status: 'idle'; attempts: Attempt[];
};
export type LessonEvent = { type: 'START_PRACTICE' } | { type: 'TOGGLE_SUPPORT'; kind: SupportKind };
