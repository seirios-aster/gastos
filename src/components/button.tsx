import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { LiquidLayer } from '@/components/liquid-layer';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useGlass } from '@/hooks/use-glass';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const glass = useGlass();
  const primary = variant === 'primary';

  // Pressing squeezes the button a little and lets go with a spring, so it feels like glass.
  const press = useSharedValue(0);
  const squeeze = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.get() * 0.035 }],
    opacity: 1 - press.get() * 0.15,
  }));
  // A soft light fills the glass under the finger while it is held, and fades when let go.
  const light = useAnimatedStyle(() => ({ opacity: press.get() }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => press.set(withSpring(1, { damping: 18, stiffness: 400 }))}
      onPressOut={() => press.set(withSpring(0, { damping: 12, stiffness: 260 }))}
      style={[
        styles.button,
        { backgroundColor: primary ? theme.primaryFill : theme.backgroundElement },
        // The main button is built like the chips: the same ring and bevel, so it has the same thickness.
        glass.chip,
        disabled && styles.disabled,
        style,
        squeeze,
      ]}>
      <LiquidLayer
        radius={Radius.control}
        tintFrom={primary ? theme.primaryFill : theme.backgroundElement}
        tintTo={primary ? theme.primaryFill : theme.backgroundElement}
      />
      <Animated.View pointerEvents="none" style={[styles.light, light]} />
      <ThemedText
        type="smallBold"
        themeColor={primary ? 'onPrimary' : variant === 'danger' ? 'danger' : 'text'}>
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Touch.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    overflow: 'hidden',
    paddingHorizontal: Spacing.three,
  },
  disabled: { opacity: 0.4 },
  light: { ...StyleSheet.absoluteFill, borderRadius: Radius.control, backgroundColor: '#FFFFFF2E' },
});
