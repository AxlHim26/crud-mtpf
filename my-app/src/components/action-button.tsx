import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function ActionButton({
  title, onPress, disabled, accessibilityLabel, variant = 'primary',
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[variant], (pressed || disabled) && styles.dimmed]}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#175cd3', borderColor: '#175cd3' },
  secondary: { backgroundColor: '#fff', borderColor: '#cbd5e1' },
  danger: { backgroundColor: '#b42318', borderColor: '#b42318' },
  label: { color: '#fff', fontSize: 14, fontWeight: '600' },
  secondaryLabel: { color: '#344054' },
  dimmed: { opacity: 0.55 },
});
