import * as Speech from 'expo-speech';
import { speakEnglish, stopSpeech } from './speech';

jest.mock('expo-speech', () => ({ stop: jest.fn(async () => undefined), speak: jest.fn() }));

test('replacement speech uses English at the requested slower rate', async () => {
  await speakEnglish('What do you do?', true);
  expect(Speech.stop).toHaveBeenCalledTimes(1);
  expect(Speech.speak).toHaveBeenCalledWith('What do you do?', expect.objectContaining({ language: 'en-US', rate: 0.65 }));
});

test('recording can cancel speech before its async stop finishes', async () => {
  let resolve!: () => void;
  jest.mocked(Speech.stop).mockImplementationOnce(() => new Promise<void>((r) => { resolve = r; }));
  const pending = speakEnglish('What do you do?', false);
  await stopSpeech();
  resolve();
  await pending;
  expect(Speech.speak).not.toHaveBeenCalled();
});
