import { act, renderHook } from '@testing-library/react-native';
import { useAudioRecorder } from 'expo-audio';
import { useLessonAudio } from './useLessonAudio.native';

jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: { ios: {} } }, IOSOutputFormat: { LINEARPCM: 'lpcm' },
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => undefined),
  useAudioRecorder: jest.fn(),
}));
jest.mock('expo-file-system', () => ({ File: class { exists = true; size = 48000; delete() {} } }));
jest.mock('./speech', () => ({ stopSpeech: jest.fn(async () => undefined), speakEnglish: jest.fn() }));

function mockNativeRecorder() {
  let status = { isRecording: false, durationMillis: 0 };
  let emit!: (event: { isFinished: boolean; hasError: boolean }) => void;
  const recorder = {
    uri: 'file:///cache/answer.m4a',
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(() => { status = { isRecording: true, durationMillis: 0 }; }),
    stop: jest.fn(async () => { status = { isRecording: false, durationMillis: 0 }; }),
    getStatus: jest.fn(() => status),
  };
  jest.mocked(useAudioRecorder).mockImplementation((_options, callback) => {
    emit = (event) => callback?.(event as never);
    return recorder as never;
  });
  return { recorder, setStatus: (next: typeof status) => { status = next; }, emit: () => emit({ isFinished: true, hasError: false }) };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('iPhone produces bounded mono 16-bit PCM WAV for server validation', async () => {
  const native = mockNativeRecorder();
  const hook = await renderHook(useLessonAudio);
  expect(jest.mocked(useAudioRecorder).mock.calls.at(-1)?.[0]).toMatchObject({
    extension: '.wav', sampleRate: 16000, numberOfChannels: 1,
    ios: { extension: '.wav', sampleRate: 16000, outputFormat: 'lpcm', linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  });
  await act(async () => { await hook.result.current.startRecording(); });
  native.setStatus({ isRecording: true, durationMillis: 3000 });
  await act(async () => { await hook.result.current.stopRecording(); });
  expect(hook.result.current.snapshot.recording?.mimeType).toBe('audio/wav');
  await hook.unmount();
});

test('native automatic completion retains duration measured before SDK reset', async () => {
  const native = mockNativeRecorder();
  const hook = await renderHook(useLessonAudio);
  await act(async () => { await hook.result.current.startRecording(); });
  native.setStatus({ isRecording: true, durationMillis: 89750 });
  await act(async () => { await jest.advanceTimersByTimeAsync(250); });
  native.setStatus({ isRecording: false, durationMillis: 0 });
  await act(async () => { native.emit(); });
  expect(hook.result.current.snapshot.status).toBe('ready');
  expect(hook.result.current.snapshot.recording?.durationMs).toBe(89750);
  await hook.unmount();
});

test('a fresh native pause stops the session even without an AppState change', async () => {
  const native = mockNativeRecorder();
  const hook = await renderHook(useLessonAudio);
  await act(async () => { await hook.result.current.startRecording(); });
  // An initial stale hook snapshot must not be mistaken for an interruption.
  expect(hook.result.current.snapshot.status).toBe('recording');
  native.setStatus({ isRecording: false, durationMillis: 3000 });
  await act(async () => { await jest.advanceTimersByTimeAsync(250); });
  expect(native.recorder.stop).toHaveBeenCalledTimes(1);
  expect(hook.result.current.interrupted).toBe(true);
  expect(hook.result.current.snapshot.status).toBe('ready');
  await hook.unmount();
});
