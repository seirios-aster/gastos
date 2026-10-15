import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  amount: string;
  footer: string;
};

/** The big accent card at the top of Today and History. */
export function SummaryCard({ label, amount, footer }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.accent }]}>
      <ThemedText type="small" themeColor="onAccent">
        {label}
      </ThemedText>
      <ThemedText
        themeColor="onAccent"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.amount}>
        {amount}
      </ThemedText>
      <ThemedText type="small" themeColor="onAccent">
        {footer}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.one },
  amount: { fontSize: 40, lineHeight: 48, fontWeight: '700' },
});
