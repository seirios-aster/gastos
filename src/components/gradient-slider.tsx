import { useState } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { Radius, Touch } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** 0 to 1: where the handle sits. */
  value: number;
  onChange: (value: number) => void;
  /** Colors the track fades through, left to right. */
  colors: string[];
  /** The thing being set, read out by screen readers, e.g. "Hue". */
  label: string;
};

const THUMB = 28;
const NUDGE = 0.05;

/** A track painted with a color gradient and a round handle: drag, or tap anywhere on it. */
export function GradientSlider({ value, onChange, colors, label }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const setFromTouch = (x: number) => {
    if (width <= 0) return;
    onChange(Math.min(1, Math.max(0, x / width)));
  };

  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;
  const track = (
    Platform.OS === 'web' ? { backgroundImage: gradient } : { experimental_backgroundImage: gradient }
  ) as ViewStyle;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        onChange(Math.min(1, Math.max(0, value + direction * NUDGE)));
      }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      // The whole 44dp row takes the touch, and keeps it so the sheet cannot scroll away mid-drag.
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => setFromTouch(event.nativeEvent.locationX)}
      onResponderMove={(event) => setFromTouch(event.nativeEvent.locationX)}
      style={styles.row}>
      <View
        pointerEvents="none"
        style={[styles.track, { backgroundColor: colors[0], borderColor: theme.fieldBorder }, track]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            left: Math.min(Math.max(value * width - THUMB / 2, 0), Math.max(width - THUMB, 0)),
            borderColor: theme.background,
            backgroundColor: theme.text,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: Touch.min, justifyContent: 'center' },
  track: { height: 16, borderRadius: Radius.pill, borderWidth: 1 },
  thumb: {
    position: 'absolute',
    top: (Touch.min - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
  },
});
