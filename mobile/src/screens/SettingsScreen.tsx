import { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, TextInput } from 'react-native';
import { deleteDeviceToken, getDeviceToken, saveDeviceToken } from '../api/deviceToken';
import { ActionButton } from '../components/ActionButton';
import { ui } from '../theme';
export function SettingsScreen({ onBack }: { onBack(): void }) {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void getDeviceToken().then((value) => setMessage(value ? '接続情報は保存済みです。' : '接続情報は未設定です。')).catch(() => setMessage('接続情報を読み込めませんでした。')); }, []);
  const save = async () => {
    setBusy(true);
    try { await saveDeviceToken(token.trim()); setToken(''); setMessage('接続情報を保存しました。'); }
    catch { setMessage('ec_ で始まる端末用コードを確認してください。OpenAIのAPIキーはここに入力しません。'); }
    finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={ui.scroll}>
    <ActionButton label="今日の練習へ" variant="quiet" disabled={busy} onPress={onBack} />
    <Text style={ui.title}>接続設定</Text>
    <Text style={ui.body}>回答を送信すると、録音と聞き取った内容がCloudflare経由でOpenAIに送られます。コーチの返答を受け取った録音は破棄します。</Text>
    <Text style={ui.muted}>現在は動作確認版です。学習履歴の端末保存はこれから対応します。実名や勤務先名を使わずに確認できます。</Text>
    <Text style={ui.caption}>{process.env.EXPO_PUBLIC_API_BASE_URL ? '接続先は設定済みです。' : '接続先の準備中です。APIの設定手順を完了してから利用できます。'}</Text>
    <Text style={ui.heading}>このiPhone用の接続コード</Text>
    <TextInput accessibilityLabel="端末用接続コード" value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy && Platform.OS === 'ios'} placeholder="ec_…" style={[ui.panel, ui.body]} />
    <ActionButton label="接続コードを保存" onPress={() => { void save(); }} disabled={busy || !token || Platform.OS !== 'ios'} />
    <Text accessibilityRole="alert" style={ui.muted}>{message}</Text>
    <ActionButton label="接続情報を消す" variant="quiet" disabled={busy} onPress={() => { void deleteDeviceToken().then(() => setMessage('接続情報を消しました。')).catch(() => setMessage('削除できませんでした。もう一度お試しください。')); }} />
    {Platform.OS !== 'ios' && <Text style={ui.caption}>接続コードはiPhoneで設定します。</Text>}
  </ScrollView>;
}
