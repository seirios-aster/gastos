import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

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
      : { boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: theme.edge, inset: true }] };
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
        <ThemedText type="display" themeColor="onHero" numberOfLines={1} adjustsFontSizeToFit>
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
