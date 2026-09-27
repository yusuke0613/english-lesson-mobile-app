import { Dispatch, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useLessonAudio } from '../audio/useLessonAudio';
import { stopSpeech } from '../audio/speech';
import { RecordingControls } from '../components/RecordingControls';
import { CoachingFeedback } from '../components/CoachingFeedback';
import { useCoaching } from '../api/useCoaching';
import { ActionButton } from '../components/ActionButton';
import { QuestionSupport } from '../components/QuestionSupport';
import { getQuestion } from '../lesson/content';
import { LessonEvent, LessonState } from '../lesson/types';
import { colors, ui } from '../theme';
export function LessonScreen({ state, dispatch, onBack }: { state: LessonState; dispatch: Dispatch<LessonEvent>; onBack: () => void }) {
  const question = getQuestion(state.questionId);
  const audio = useLessonAudio();
  const coaching = useCoaching(audio.discardRecording);
  const sending = ['transcribing', 'replying'].includes(coaching.snapshot.status);
  const [speechError, setSpeechError] = useState(false);
  const busy = sending || ['preparing', 'recording', 'stopping'].includes(audio.snapshot.status);
  const listen = async (example: boolean, slow: boolean) => {
    setSpeechError(false);
    try {
      await audio.speakEnglish(example ? question.example : question.english, slow);
      dispatch(example ? { type: 'EXAMPLE_PLAYED' } : { type: 'QUESTION_PLAYED', slow });
    } catch { setSpeechError(true); }
  };
  const back = () => {
    const leave = async () => {
      if (!await audio.discardRecording()) return;
      await stopSpeech();
      onBack();
    };
    if (busy || audio.snapshot.recording) Alert.alert('録音を破棄して戻りますか？', 'この録音は送信していません。', [
      { text: '練習を続ける', style: 'cancel' }, { text: '破棄して戻る', style: 'destructive', onPress: () => { void leave(); } },
    ]);
    else void leave();
  };
  return <ScrollView contentContainerStyle={ui.scroll}>
    <View style={ui.row}><ActionButton label="今日の練習へ" variant="quiet" disabled={sending} onPress={back} /><Text style={ui.caption}>自己紹介</Text></View>
    {state.phase === 'prepare' ? <>
      <Text style={ui.title}>{'新しい同僚に、\n話しかけられたら。'}</Text><Text style={ui.body}>今日は呼び名と仕事を伝えます。まずは、お手本を見てみましょう。</Text>
      <View style={ui.panel}><Text style={ui.english}>{question.english}</Text><Text style={ui.muted}>{question.meaningJa}</Text></View>
      <View style={ui.hint}><Text style={ui.caption}>こんなふうに答えられます</Text><Text style={ui.heading}>{question.example}</Text><Text style={ui.muted}>{question.exampleJa}</Text></View>
      <ActionButton label="お手本を聞く" variant="secondary" onPress={() => { void listen(true, false); }} />
      <Text style={ui.muted}>実名や会社名は入力しなくても大丈夫です。</Text><ActionButton label="会話の練習へ" onPress={() => dispatch({ type: 'START_PRACTICE' })} />
    </> : <>
      <Text style={[ui.caption, { color: colors.blue }]}>名前と仕事 / 1問目</Text><Text style={ui.title}>{'ひとこと、\n答えてみましょう。'}</Text>
      <QuestionSupport question={question} visible={state.visibleSupport} onToggle={(kind) => dispatch({ type: 'TOGGLE_SUPPORT', kind })} />
      <View style={ui.row}><View style={{ flex: 1 }}><ActionButton label={state.support.playCount ? 'もう一度聞く' : '質問を聞く'} variant="quiet" disabled={busy} onPress={() => { void listen(false, false); }} /></View><View style={{ flex: 1 }}><ActionButton label="ゆっくり聞く" variant="quiet" disabled={busy} onPress={() => { void listen(false, true); }} /></View></View>
      {state.visibleSupport.template && <ActionButton label="例を聞く" variant="secondary" disabled={busy} onPress={() => { void listen(true, false); }} />}
      {coaching.snapshot.status === 'idle' && <RecordingControls audio={audio} onSend={() => {
        if (audio.snapshot.recording) void coaching.session.submit(audio.snapshot.recording, state.questionId, state.support);
      }} />}
      <CoachingFeedback state={coaching.snapshot} onAgain={() => { void audio.discardRecording().then((ok) => { if (ok) coaching.session.reset(); }); }} onListen={(text) => { void audio.speakEnglish(text, false).catch(() => setSpeechError(true)); }} />
      {coaching.snapshot.status !== 'idle' && audio.snapshot.error === 'cleanup' && <Text accessibilityRole="alert" style={ui.muted}>録音を破棄できませんでした。「新しく録音する」で削除を再試行できます。</Text>}
    </>}
    {speechError && <Text accessibilityRole="alert" style={ui.muted}>読み上げを開始できませんでした。音声の設定を確認してください。</Text>}
    <Text style={ui.caption}>音が出ない場合は、音量とiPhoneのサイレントモードを確認してください。</Text>
  </ScrollView>;
}
