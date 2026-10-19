import { useState } from 'react';
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
  /**
   * Makes the chart tappable: called with the key of the bar under the finger. The whole column
   * counts, so a thin bar is no harder to hit than a tall one.
   */
  onPickBar?: (key: string) => void;
};

export function BarChart({ bars, height = 110, accessibilityLabel, onPickBar }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const gap = bars.length > 12 ? 2 : 8;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View
        style={[styles.plot, { height, gap }]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => onPickBar !== undefined}
        onResponderRelease={(event) => {
          if (!onPickBar || width <= 0) return;
          const index = Math.floor((event.nativeEvent.locationX / width) * bars.length);
          const bar = bars[Math.min(bars.length - 1, Math.max(0, index))];
          if (bar) onPickBar(bar.key);
        }}>
        {bars.map((bar) => (
          <View key={bar.key} style={styles.column}>
            <View
              pointerEvents="none"
              style={[
                styles.bar,
                {
                  height: bar.value > 0 ? Math.max((bar.value / max) * height, 4) : 2,
                  backgroundColor: bar.value === 0 ? theme.backgroundSelected : theme.accent,
                  // 0.8 keeps the bars at 3:1 or better against the card (0.55 gave 2.2:1 in light mode).
                  opacity: bar.value === 0 || bar.highlight ? 1 : 0.8,
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
                type="caption"
                themeColor={bar.highlight ? 'text' : 'textSecondary'}
                maxFontSizeMultiplier={1.3}
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
  label: { width: 40, textAlign: 'center' },
});
