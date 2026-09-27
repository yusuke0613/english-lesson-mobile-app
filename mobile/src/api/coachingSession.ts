import { Recording } from '../audio/recorder';
import { QuestionId, SupportUsage } from '../lesson/types';
import { CoachClient, CoachError } from './coachClient';
import { Evaluation } from './contracts';

export type CoachingSnapshot = { status: 'idle' | 'transcribing' | 'replying' | 'feedback' | 'error'; transcript: string | null; evaluation: Evaluation | null; error: string | null };
const idle: CoachingSnapshot = { status: 'idle', transcript: null, evaluation: null, error: null };
export class CoachingSession {
  private snapshot = idle;
  private listeners = new Set<() => void>();
  constructor(private client: CoachClient, private makeId: () => string, private discard: () => Promise<boolean>, private persistTranscript: (text: string) => Promise<void> = async () => undefined) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(next: CoachingSnapshot) { this.snapshot = next; this.listeners.forEach((listener) => listener()); }
  reset() { if (!['transcribing', 'replying'].includes(this.snapshot.status)) this.update(idle); }
  async submit(recording: Recording, questionId: QuestionId, support: SupportUsage) {
    if (this.snapshot.status !== 'idle') return;
    this.update({ ...idle, status: 'transcribing' });
    try {
      const { transcript } = await this.client.transcribe(recording, this.makeId());
      this.update({ ...this.snapshot, status: 'replying', transcript });
      await this.persistTranscript(transcript);
      const { evaluation } = await this.client.reply({ lessonId: 'self-introduction', questionId, transcript, support: { ...support }, context: [] }, this.makeId());
      if (evaluation.correction && evaluation.correction.original !== transcript) throw new CoachError('INVALID_RESPONSE');
      this.update({ ...this.snapshot, status: 'feedback', evaluation });
      await this.discard();
    } catch (error) {
      this.update({ ...this.snapshot, status: 'error', error: error instanceof CoachError ? error.code : 'RESULT_UNKNOWN' });
    }
  }
}
