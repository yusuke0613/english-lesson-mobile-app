import { StyleSheet } from 'react-native';
export const colors = { background: '#f8faff', paper: '#ffffff', ink: '#19283f', muted: '#647086', blue: '#235ec0', soft: '#eaf1ff', line: '#dce3ee', good: '#256953', danger: '#a33434' };
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center', padding: 24, gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '700', lineHeight: 42, letterSpacing: -0.5 },
  heading: { color: colors.ink, fontSize: 20, fontWeight: '600', lineHeight: 30 },
  body: { color: colors.ink, fontSize: 16, lineHeight: 26 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 23 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  english: { color: colors.ink, fontSize: 29, lineHeight: 40, fontWeight: '600' },
  panel: { backgroundColor: colors.paper, borderRadius: 22, padding: 22, gap: 16 },
  hint: { backgroundColor: colors.soft, borderRadius: 14, padding: 18, gap: 8 },
  stack: { gap: 16 },
});
