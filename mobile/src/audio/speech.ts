import * as Speech from 'expo-speech';

let generation = 0;
export async function stopSpeech(): Promise<void> {
  ++generation;
  await Speech.stop();
}
export async function speakEnglish(text: string, slow: boolean): Promise<void> {
  const current = ++generation;
  await Speech.stop();
  if (current !== generation) return;
  Speech.speak(text, { language: 'en-US', rate: slow ? 0.65 : 0.85 });
}
