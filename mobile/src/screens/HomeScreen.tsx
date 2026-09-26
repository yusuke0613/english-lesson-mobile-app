import { ScrollView, Text, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { colors, ui } from '../theme';
export function HomeScreen({ onStart }: { onStart: () => void }) {
  return <ScrollView contentContainerStyle={ui.scroll}>
    <View style={ui.row}><Text style={ui.heading}>English Coach</Text><Text style={ui.caption}>今日の練習</Text></View>
    <View style={{ paddingVertical: 16, gap: 12 }}><Text style={ui.title}>{'少しずつ、\n仕事で使える英語へ。'}</Text><Text style={ui.muted}>{'分からないときは、日本語の助けを。\n話す準備ができてからで大丈夫。'}</Text></View>
    <View style={[ui.panel, { backgroundColor: colors.soft, gap: 20 }]}>
      <Text style={{ color: colors.blue, fontSize: 14, fontWeight: '600' }}>自己紹介 / 名前と仕事</Text><Text style={ui.title}>{'はじめまして、\nを自分の言葉で。'}</Text>
      <Text style={ui.body}>新しく会った同僚に、呼び名と仕事を短く伝える練習です。</Text><ActionButton label="練習を始める" onPress={onStart} /><Text style={ui.caption}>1日15分が目安。自分のペースで進められます。</Text>
    </View>
    <View style={ui.stack}><Text style={ui.heading}>今日の流れ</Text>
      {[
        ['1', '場面とお手本', 'まずは、短い一言から。'],
        ['2', '聞いて、話してみる', '意味と答え方を、必要なときに。'],
        ['3', '自分で答えて、振り返る', '今日の表現を、明日の復習へ。'],
      ].map(([step, title, detail]) => <View key={step} style={[ui.row, { justifyContent: 'flex-start' }]}><Text style={{ color: colors.blue, backgroundColor: colors.soft, padding: 10, borderRadius: 10 }}>{step}</Text><View style={{ flex: 1 }}><Text style={ui.body}>{title}</Text><Text style={ui.muted}>{detail}</Text></View></View>)}
    </View>
    <Text style={ui.caption}>開発中のプレビューです。AIの応答・学習記録の保存はこれから対応します。</Text>
  </ScrollView>;
}
