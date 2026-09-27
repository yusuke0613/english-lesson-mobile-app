import { Text, View } from 'react-native';
import { CoachingSnapshot } from '../api/coachingSession';
import { ActionButton } from './ActionButton';
import { ui } from '../theme';
const messages: Record<string, string> = {
  CONFIG_REQUIRED: '接続設定が必要です。「今日の練習へ」から接続設定を開いてください。',
  AI_NOT_CONFIGURED: 'コーチの接続準備がまだ完了していません。',
  UNAUTHORIZED: '接続情報を確認してください。', DEVICE_DISABLED: '接続情報の期限が切れたか、無効になっています。',
  BUDGET_EXCEEDED: '今月のAI利用枠に達しました。',
  NO_SPEECH: '声を聞き取れませんでした。短い一言を録り直してください。',
  UNSUPPORTED_AUDIO: '録音形式を確認できませんでした。アプリを再読み込みして録り直してください。',
};
export function CoachingFeedback({ state, onAgain, onListen }: { state: CoachingSnapshot; onAgain(): void; onListen(text: string): void }) {
  if (state.status === 'idle') return null;
  return <View style={ui.stack}>
    {state.status === 'transcribing' && <Text accessibilityRole="alert" style={ui.body}>声を聞き取っています…</Text>}
    {state.transcript && <View style={ui.panel}><Text style={ui.caption}>聞き取った内容</Text><Text style={ui.body}>{state.transcript}</Text></View>}
    {state.status === 'replying' && <Text accessibilityRole="alert" style={ui.body}>コーチが返答を準備しています…</Text>}
    {state.evaluation && <View style={ui.hint}>
      <Text style={ui.caption}>コーチの返答</Text><Text style={ui.heading}>{state.evaluation.replyEn}</Text><Text style={ui.body}>{state.evaluation.reasonJa}</Text>
      {state.evaluation.correction && <><Text style={ui.caption}>こんな言い方もできます</Text><Text style={ui.body}>{state.evaluation.correction.improved}</Text><Text style={ui.muted}>{state.evaluation.correction.explanationJa}</Text></>}
      <ActionButton label="返答を聞く" variant="secondary" onPress={() => onListen(state.evaluation!.replyEn)} />
    </View>}
    {state.error && <Text accessibilityRole="alert" style={ui.body}>{messages[state.error] ?? '返答を確認できませんでした。処理済みの可能性があるため、自動では再送しません。'}</Text>}
    {['feedback', 'error'].includes(state.status) && <>
      <ActionButton label="新しく録音する" variant="secondary" onPress={onAgain} />
      <Text style={ui.caption}>新しい回答を送信すると、AI利用枠を使います。現在の確認版は最初の1問までで、この画面を離れると返答は残りません。</Text>
    </>}
  </View>;
}
