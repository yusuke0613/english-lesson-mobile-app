import { Linking, Text, View } from 'react-native';
import { RecordingError } from '../audio/recorder';
import { LessonAudio } from '../audio/useLessonAudio.types';
import { colors, ui } from '../theme';
import { ActionButton } from './ActionButton';

const errors: Record<RecordingError, string> = {
  permission: 'マイクの使用を許可すると録音できます。iPhoneの設定を確認してください。',
  'too-large': '録音のサイズが大きいため送信できません。短く録り直してください。',
  'too-short': '録音が短すぎました。ひとこと話してから止めてください。',
  'too-long': '録音が90秒を超えました。短く録り直してください。',
  missing: '録音を読み込めませんでした。もう一度録音してください。',
  device: '録音を完了できませんでした。マイクや他の音声アプリを確認し、録り直してください。',
  cleanup: '録音を破棄できませんでした。もう一度「録音を破棄」を押してください。',
};
export function RecordingControls({ audio }: { audio: LessonAudio }) {
  const { snapshot } = audio;
  const busy = snapshot.status === 'preparing' || snapshot.status === 'stopping';
  return <View style={ui.stack}>
    {audio.interrupted && <Text style={ui.muted}>録音が中断されました。送信はしていません。録り直すか、破棄してください。</Text>}
    {snapshot.error && <Text accessibilityRole="alert" style={[ui.body, { color: colors.danger }]}>{errors[snapshot.error]}</Text>}
    {snapshot.error === 'permission' && <ActionButton label="iPhoneの設定を開く" variant="secondary" onPress={() => { void Linking.openSettings().catch(() => undefined); }} />}
    {snapshot.status === 'recording' ? <>
      <Text style={[ui.heading, { textAlign: 'center', color: colors.blue }]}>声を聞いています</Text>
      <Text style={[ui.body, { textAlign: 'center' }]}>{Math.floor(audio.durationMs / 1000)}秒 / 90秒まで</Text>
      <ActionButton label="録音を止める" onPress={() => { void audio.stopRecording(); }} />
      <ActionButton label="取り消す" variant="quiet" onPress={() => { void audio.discardRecording(); }} />
    </> : snapshot.recording ? <>
      {snapshot.status === 'ready' && <Text style={ui.body}>録音できました（{Math.round(snapshot.recording.durationMs / 1000)}秒）。</Text>}
      <ActionButton label="録音を破棄" variant="secondary" onPress={() => { void audio.discardRecording(); }} />
      <Text style={ui.caption}>AIへの送信はまだ接続していません。この録音は学習履歴に保存されません。</Text>
    </> : <>
      <ActionButton label={busy ? '準備しています…' : '録音する'} disabled={busy || !audio.canRecord} onPress={() => { void audio.startRecording(); }} />
      <Text style={ui.caption}>{audio.canRecord ? '話す準備ができてからで大丈夫。最大90秒で自動停止します。' : '録音はiPhoneのExpo Goで確認できます。ブラウザーでは画面と読み上げを確認できます。'}</Text>
    </>}
  </View>;
}
