import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';
type Props = { label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'quiet'; disabled?: boolean; expanded?: boolean };
export function ActionButton({ label, onPress, variant = 'primary', disabled, expanded }: Props) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, expanded }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.base, styles[variant], (pressed || disabled) && styles.dim]}>
    <Text style={[styles.label, variant === 'primary' ? styles.light : styles.blue]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  base: { minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16 },
  primary: { backgroundColor: colors.blue }, secondary: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line }, quiet: { backgroundColor: 'transparent' },
  label: { fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' }, light: { color: colors.paper }, blue: { color: colors.blue }, dim: { opacity: 0.55 },
});
