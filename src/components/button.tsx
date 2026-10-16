import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  /**
   * primary: accent fill, for the one main action of a screen or form.
   * secondary: the card gray, for the other actions.
   * danger: like secondary, with the label in the danger color (stop, erase).
   */
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  /** For a button that opens and closes something, e.g. "Restore from backup". */
  expanded?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/** The app's one button: 48dp high, 12dp corners, a dimmed look while pressed. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  expanded,
  accessibilityHint,
  style,
}: Props) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? theme.accent : theme.backgroundElement },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      <ThemedText
        type="smallBold"
        themeColor={primary ? 'onAccent' : variant === 'danger' ? 'danger' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Touch.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
