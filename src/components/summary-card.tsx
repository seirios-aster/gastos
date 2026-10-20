import { Platform, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  amount: string;
  footer: string;
  /** A budget strip, drawn as the card's bottom zone. */
  children?: React.ReactNode;
};

/**
 * The big number at the top of Today, History and Recurring: a deep-blue gradient card with white
 * text (the same in both themes) and, optionally, the budget strip folded into its bottom edge.
 * The number part reads as one sentence to a screen reader; the strip is its own element.
 */
export function SummaryCard({ label, amount, footer, children }: Props) {
  const theme = useTheme();
  const gradient = `linear-gradient(135deg, ${theme.heroFrom}, ${theme.heroTo})`;
  // The plain color is the fallback wherever a gradient style is not available.
  const heroStyle: ViewStyle = { backgroundColor: theme.heroFrom };
  // The glass look also rings the number card, drawn inside so its size does not change.
  const ring: ViewStyle | undefined =
    theme.edge === '#00000000'
      ? undefined
      : {
          boxShadow: [
            { offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: theme.edge, inset: true },
            // A faint bright line along the top edge, like light catching the glass.
            { offsetX: 0, offsetY: 1, blurRadius: 0, color: theme.edge, inset: true },
          ],
        };
  // On a glass card the big number glows a little in the accent color, so it stands out.
  const numberGlow: TextStyle | undefined =
    theme.edge === '#00000000' || theme.onHero !== '#FFFFFF'
      ? undefined
      : { textShadowColor: `${theme.accent}99`, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } };
  const gradientStyle = (
    Platform.OS === 'web' ? { backgroundImage: gradient } : { experimental_backgroundImage: gradient }
  ) as ViewStyle;

  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={`${label}, ${amount}. ${footer}`}
        style={[styles.top, heroStyle, gradientStyle, ring]}>
        <ThemedText type="small" themeColor="onHeroMuted">
          {label}
        </ThemedText>
        <ThemedText
          type="display"
          themeColor="onHero"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={numberGlow}>
          {amount}
        </ThemedText>
        <ThemedText type="small" themeColor="onHeroMuted">
          {footer}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, overflow: 'hidden' },
  top: { paddingHorizontal: Spacing.four, paddingVertical: 20, gap: Spacing.one },
});
