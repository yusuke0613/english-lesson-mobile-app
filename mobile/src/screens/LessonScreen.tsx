import { Dispatch } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { QuestionSupport } from '../components/QuestionSupport';
import { getQuestion } from '../lesson/content';
import { LessonEvent, LessonState } from '../lesson/types';
import { colors, ui } from '../theme';
export function LessonScreen({ state, dispatch, onBack }: { state: LessonState; dispatch: Dispatch<LessonEvent>; onBack: () => void }) {
  const question = getQuestion(state.questionId);
  return <ScrollView contentContainerStyle={ui.scroll}>
    <View style={ui.row}><ActionButton label="今日の練習へ" variant="quiet" onPress={onBack} /><Text style={ui.caption}>自己紹介</Text></View>
    {state.phase === 'prepare' ? <>
      <Text style={ui.title}>{'新しい同僚に、\n話しかけられたら。'}</Text><Text style={ui.body}>今日は呼び名と仕事を伝えます。まずは、お手本を見てみましょう。</Text>
      <View style={ui.panel}><Text style={ui.english}>{question.english}</Text><Text style={ui.muted}>{question.meaningJa}</Text></View>
      <View style={ui.hint}><Text style={ui.caption}>こんなふうに答えられます</Text><Text style={ui.heading}>{question.example}</Text><Text style={ui.muted}>{question.exampleJa}</Text></View>
      <Text style={ui.muted}>実名や会社名は入力しなくても大丈夫です。</Text><ActionButton label="会話の練習へ" onPress={() => dispatch({ type: 'START_PRACTICE' })} />
    </> : <>
      <Text style={[ui.caption, { color: colors.blue }]}>名前と仕事 / 1問目</Text><Text style={ui.title}>{'ひとこと、\n答えてみましょう。'}</Text>
      <QuestionSupport question={question} visible={state.visibleSupport} onToggle={(kind) => dispatch({ type: 'TOGGLE_SUPPORT', kind })} />
      <View style={ui.stack}><ActionButton label="録音する（準備中）" disabled /><Text style={ui.caption}>意味やお手本を見た後に、自分の声で答えます。</Text></View>
    </>}
  </ScrollView>;
}
