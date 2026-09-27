export type Stage = 'transcription' | 'reply' | 'summary';
export interface Env {
  DB: D1Database;
  OPENAI_API_KEY?: string;
  AI_ENABLED?: string;
  TRANSCRIPTION_MODEL?: string;
  TEXT_MODEL?: string;
  MONTHLY_LIMIT_MICRO_USD?: string;
}
export class ApiError extends Error {
  constructor(public code: string, public status: number, public retryable = false) { super(code); }
}
export type LedgerDb = Pick<D1DatabaseSession, 'prepare'>;
