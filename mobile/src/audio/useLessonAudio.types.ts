import { RecorderSnapshot, Recording } from './recorder';
export type LessonAudio = {
  snapshot: RecorderSnapshot; durationMs: number; canRecord: boolean; interrupted: boolean;
  startRecording(): Promise<void>; stopRecording(): Promise<Recording | null>; discardRecording(): Promise<boolean>;
  speakEnglish(text: string, slow: boolean): Promise<void>;
};
