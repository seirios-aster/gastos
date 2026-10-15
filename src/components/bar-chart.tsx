import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type Bar = {
  key: string;
  value: number;
  /** Shown under the bar; leave out to keep a busy axis readable. */
  label?: string;
  highlight?: boolean;
};

type Props = {
  bars: Bar[];
  height?: number;
  accessibilityLabel: string;
};

export function BarChart({ bars, height = 110, accessibilityLabel }: Props) {
  const theme = useTheme();
  const max = Math.max(1, ...bars.map((b) => b.value));
  const gap = bars.length > 12 ? 2 : 8;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={[styles.plot, { height, gap }]}>
        {bars.map((bar) => (
          <View key={bar.key} style={styles.column}>
            <View
              style={[
                styles.bar,
                {
                  height: bar.value > 0 ? Math.max((bar.value / max) * height, 4) : 2,
                  backgroundColor: bar.value === 0 ? theme.backgroundSelected : theme.accent,
                  opacity: bar.value === 0 || bar.highlight ? 1 : 0.55,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={[styles.labels, { gap }]}>
        {bars.map((bar) => (
          <View key={bar.key} style={styles.labelCell}>
            {bar.label ? (
              <ThemedText
                type="small"
                themeColor={bar.highlight ? 'text' : 'textSecondary'}
                style={styles.label}>
                {bar.label}
              </ThemedText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  column: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  labels: { flexDirection: 'row', marginTop: 6 },
  labelCell: { flex: 1, alignItems: 'center', overflow: 'visible' },
  // Wider than its (narrow) bar column on purpose; the cell lets it overflow evenly on both sides.
  label: { fontSize: 11, lineHeight: 14, width: 40, textAlign: 'center' },
});
