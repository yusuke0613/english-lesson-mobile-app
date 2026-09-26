import { Question, QuestionId } from './types';

const workSupport = { intentJa: '職種や、働いている分野を答えましょう。', pattern: 'I work in ___.', example: 'I work in IT.', exampleJa: 'ITの仕事をしています。' };
const questions: Record<QuestionId, Question> = {
  'intro-name': { id: 'intro-name', english: 'What should I call you?', meaningJa: '何とお呼びすればよいですか？', intentJa: '呼んでほしい名前を答えましょう。架空の名前でも大丈夫です。', pattern: 'You can call me ___.', example: 'You can call me Alex.', exampleJa: 'アレックスと呼んでください。' },
  'intro-work': { ...workSupport, id: 'intro-work', english: 'What do you do?', meaningJa: 'どんな仕事をしていますか？' },
  'intro-work-check': { ...workSupport, id: 'intro-work-check', english: 'Can you tell me about your work?', meaningJa: 'あなたの仕事について教えてもらえますか？' },
  'intro-work-review': { ...workSupport, id: 'intro-work-review', english: 'What kind of work do you do?', meaningJa: 'どのような仕事をしていますか？' },
};
export function getQuestion(questionId: string): Question {
  if (!Object.hasOwn(questions, questionId)) throw new Error('この質問は見つかりません。');
  return questions[questionId as QuestionId];
}
