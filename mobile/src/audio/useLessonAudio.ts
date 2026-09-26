import { LessonAudio } from './useLessonAudio.types';
import { speakEnglish } from './speech';

// The browser is a UI preview. Recording is verified on the target iPhone.
export function useLessonAudio(): LessonAudio {
  return {
    snapshot: { status: 'idle', recording: null, error: null }, durationMs: 0, canRecord: false, interrupted: false,
    startRecording: async () => undefined, stopRecording: async () => null,
    discardRecording: async () => true, speakEnglish,
  };
}
