import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useLessonAudio } from '../audio/useLessonAudio';
import { createLessonState } from '../lesson/reducer';
import { LessonScreen } from './LessonScreen';

jest.mock('../audio/useLessonAudio', () => ({ useLessonAudio: jest.fn() }));
jest.mock('../audio/speech', () => ({ stopSpeech: jest.fn(async () => undefined) }));

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
