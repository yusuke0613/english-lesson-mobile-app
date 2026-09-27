import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useLessonAudio } from '../audio/useLessonAudio';
import { createLessonState } from '../lesson/reducer';
import { LessonScreen } from './LessonScreen';
import { createCoachClient } from '../api/coachClient';

jest.mock('../audio/useLessonAudio', () => ({ useLessonAudio: jest.fn() }));
jest.mock('../audio/speech', () => ({ stopSpeech: jest.fn(async () => undefined) }));
jest.mock('../api/coachClient', () => ({ ...jest.requireActual('../api/coachClient'), createCoachClient: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '1a3589c1-8042-4085-a043-c039556fe2fb' }));

test('stays on the lesson when the recording could not be discarded', async () => {
  const discardRecording = jest.fn(async () => false);
  jest.mocked(useLessonAudio).mockReturnValue({
    snapshot: { status: 'ready', error: null, recording: { uri: 'file:///answer.m4a', durationMs: 3000, sizeBytes: 1000, mimeType: 'audio/mp4' } },
    durationMs: 3000, canRecord: true, interrupted: false,
    startRecording: jest.fn(), stopRecording: jest.fn(), discardRecording, speakEnglish: jest.fn(),
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const onBack = jest.fn();
  const screen = await render(<LessonScreen state={createLessonState('session', '2026-09-26T00:00:00Z')} dispatch={jest.fn()} onBack={onBack} />);
  await fireEvent.press(screen.getByRole('button', { name: '今日の練習へ' }));
  await act(async () => { alert.mock.calls[0][2]?.[1].onPress?.(); });
  expect(discardRecording).toHaveBeenCalled();
  expect(onBack).not.toHaveBeenCalled();
  alert.mockRestore();
});

test('sending recorded audio shows transcript and real response stages', async () => {
  const discardRecording = jest.fn(async () => true);
  jest.mocked(useLessonAudio).mockReturnValue({
    snapshot: { status: 'ready', error: null, recording: { uri: 'file:///answer.wav', durationMs: 3000, sizeBytes: 96044, mimeType: 'audio/wav' } },
    durationMs: 3000, canRecord: true, interrupted: false,
    startRecording: jest.fn(), stopRecording: jest.fn(), discardRecording, speakEnglish: jest.fn(),
  });
  const evaluation = { outcome: 'answered' as const, reasonJa: '呼び名を伝えられました。', replyEn: 'Nice to meet you, Alex.', correction: null };
  const client = {
    transcribe: jest.fn(async () => ({ requestId: 'id', transcript: 'You can call me Alex.', usage: { estimatedMicroUsd: 1 } })),
    reply: jest.fn(async () => ({ requestId: 'id', evaluation, usage: { estimatedMicroUsd: 1 } })), summarize: jest.fn(),
  };
  jest.mocked(createCoachClient).mockReturnValue(client);
  const state = { ...createLessonState('session', '2026-09-26T00:00:00Z'), phase: 'practice' as const };
  const screen = await render(<LessonScreen state={state} dispatch={jest.fn()} onBack={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: '回答を送信' }));
  expect(await screen.findByText('Nice to meet you, Alex.')).toBeTruthy();
  expect(screen.getByText('You can call me Alex.')).toBeTruthy();
  expect(discardRecording).toHaveBeenCalledTimes(1);
});
