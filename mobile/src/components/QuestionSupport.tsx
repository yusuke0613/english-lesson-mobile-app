import { Text, View } from 'react-native';
import { Question, SupportKind, VisibleSupport } from '../lesson/types';
import { colors, ui } from '../theme';
import { ActionButton } from './ActionButton';
type Props = { question: Question; visible: VisibleSupport; onToggle: (kind: SupportKind) => void };
export function QuestionSupport({ question, visible, onToggle }: Props) {
  return <View style={ui.stack}>
    <View style={ui.panel}><Text style={ui.caption}>英会話コーチ</Text>
      {visible.english ? <Text style={ui.english} accessibilityLanguage="en-US">{question.english}</Text> : <Text style={ui.heading}>まずは、質問を聞いてみましょう。</Text>}
    </View>
    {!visible.english && <ActionButton label="英文を見る" variant="quiet" onPress={() => onToggle('english')} />}
    <View style={ui.row}>
      <View style={{ flex: 1 }}><ActionButton label={visible.meaning ? '意味を隠す' : '意味を見る'} variant="secondary" expanded={visible.meaning} onPress={() => onToggle('meaning')} /></View>
      <View style={{ flex: 1 }}><ActionButton label={visible.template ? '答え方を隠す' : '答え方を見る'} variant="secondary" expanded={visible.template} onPress={() => onToggle('template')} /></View>
    </View>
    {visible.meaning && <View style={ui.hint}><Text style={[ui.caption, { color: colors.blue }]}>質問の意味</Text><Text style={ui.body}>{question.meaningJa}</Text><Text style={ui.muted}>{question.intentJa}</Text></View>}
    {visible.template && <View style={ui.hint}><Text style={[ui.caption, { color: colors.blue }]}>答え方の型</Text><Text style={ui.heading} accessibilityLanguage="en-US">{question.pattern}</Text><Text style={ui.muted}>空欄に、自分の言葉を入れてみましょう。</Text><Text style={ui.body} accessibilityLanguage="en-US">{question.example}</Text><Text style={ui.muted}>{question.exampleJa}</Text></View>}
  </View>;
}
