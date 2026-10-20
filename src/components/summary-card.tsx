import { Platform, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';

import { FrostLayer } from '@/components/frost-layer';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useGlass } from '@/hooks/use-glass';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  amount: string;
  footer: string;
  /** A budget strip, drawn as the card's bottom zone. */
  children?: React.ReactNode;
};

/**
 * The big number at the top of Today, History and Recurring: a glass card tinted with the accent, with
 * the number in bold light text and, optionally, the budget strip folded into its bottom edge.
 * The number part reads as one sentence to a screen reader; the strip is its own element.
 */
export function SummaryCard({ label, amount, footer, children }: Props) {
  const theme = useTheme();
  const glass = useGlass();
  const gradient = `linear-gradient(135deg, ${theme.heroFrom}, ${theme.heroTo})`;
  // The plain color is the fallback wherever a gradient style is not available.
  const heroStyle: ViewStyle = { backgroundColor: theme.heroFrom };
  const gradientStyle = (
    Platform.OS === 'web' ? { backgroundImage: gradient } : { experimental_backgroundImage: gradient }
  ) as ViewStyle;
  // The number card is glass too, and the number itself glows softly in the accent color so it
  // still stands out (in light mode the text is dark, so it needs no glow).
  const numberGlow: TextStyle | undefined =
    theme.onHero === '#FFFFFF'
      ? { textShadowColor: `${theme.accent}99`, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } }
      : undefined;

  return (
    <View style={[styles.card, glass.drop]}>
      <View
        accessible
        accessibilityLabel={`${label}, ${amount}. ${footer}`}
        style={[styles.top, heroStyle, gradientStyle, glass.inset]}>
        <FrostLayer />
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
