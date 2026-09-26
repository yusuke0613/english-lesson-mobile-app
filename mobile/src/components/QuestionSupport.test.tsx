import { fireEvent, render, screen } from '@testing-library/react-native';
import { useReducer } from 'react';
import { getQuestion } from '../lesson/content';
import { createLessonState, lessonReducer } from '../lesson/reducer';
import { QuestionSupport } from './QuestionSupport';

function PracticeQuestion() {
  const [state, dispatch] = useReducer(lessonReducer, undefined, () =>
    lessonReducer(createLessonState('test', '2026-09-26T01:00:00Z'), { type: 'START_PRACTICE' }),
  );
  return <QuestionSupport question={getQuestion(state.questionId)} visible={state.visibleSupport}
    onToggle={(kind) => dispatch({ type: 'TOGGLE_SUPPORT', kind })} />;
}

test('a learner can reveal and hide the meaning and answer pattern', async () => {
  await render(<PracticeQuestion />);
  expect(screen.getByText('What should I call you?')).toBeTruthy();
  expect(screen.queryByText('何とお呼びすればよいですか？')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '意味を見る' }));
  expect(screen.getByText('何とお呼びすればよいですか？')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '意味を隠す' }));
  expect(screen.queryByText('何とお呼びすればよいですか？')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '答え方を見る' }));
  expect(screen.getByText('You can call me ___.')).toBeTruthy();
});
