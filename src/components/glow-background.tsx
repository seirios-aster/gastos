import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

/** The same color fully see-through, so a glow fades out without turning grey. */
const faded = (color: string) => `${color.slice(0, 7)}00`;

type Blob = {
  /** Where its center sits, as a share of the screen. */
  x: number;
  y: number;
  size: number;
  /** How far it drifts and how long one swing takes. */
  dx: number;
  dy: number;
  seconds: number;
};

// Five soft-edged shapes of color. They are what frosted panels blur, so they need a defined
// edge (a flat glow would blur into nothing). They sit around and behind where cards are.
const BLOBS: Blob[] = [
  { x: 0.12, y: 0.09, size: 300, dx: 36, dy: 28, seconds: 14 },
  { x: 0.92, y: 0.3, size: 280, dx: -32, dy: 36, seconds: 17 },
  { x: 0.1, y: 0.62, size: 300, dx: 30, dy: -30, seconds: 19 },
  { x: 0.9, y: 0.86, size: 270, dx: -28, dy: -24, seconds: 16 },
  { x: 0.55, y: 0.46, size: 220, dx: 40, dy: 32, seconds: 22 },
];

function GlowBlob({ blob, color, still }: { blob: Blob; color: string; still: boolean }) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (still) {
      cancelAnimation(t);
      t.set(0);
      return;
    }
    t.set(
      withRepeat(withTiming(1, { duration: blob.seconds * 1000, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
    return () => cancelAnimation(t);
  }, [blob.seconds, still, t]);

  // A slow drift, so the glow behind the glass is alive without drawing the eye.
  const drift = useAnimatedStyle(() => ({
    transform: [{ translateX: t.get() * blob.dx }, { translateY: t.get() * blob.dy }],
  }));

  const radius = blob.size / 2;
  // Two sizes on purpose: React Native reads a gradient with one size and a position wrongly.
  // Solid in the middle with a short soft edge, so the shape has an outline to blur.
  const image = `radial-gradient(ellipse ${radius}px ${radius}px at 50% 50%, ${color} 0%, ${color} 64%, ${faded(color)} 74%)`;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          width: blob.size,
          height: blob.size,
          left: `${blob.x * 100}%`,
          top: `${blob.y * 100}%`,
          marginLeft: -radius,
          marginTop: -radius,
          experimental_backgroundImage: image,
        } as ViewStyle,
        drift,
      ]}
    />
  );
}

/**
 * The soft color glow behind every screen: five slowly drifting shapes of color. Put it first
 * inside a screen so everything else lies on top. It stands still when the phone asks apps to
 * reduce motion.
 */
export function GlowBackground() {
  const theme = useTheme();
  const colors = [theme.glowA, theme.glowB, theme.glowC, theme.glowD, theme.glowE];

  const still = useReducedMotion();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.layer}>
      {BLOBS.map((blob, i) => (
        <GlowBlob key={i} blob={blob} color={colors[i]} still={still} />
      ))}
    </View>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (active) setReduced(enabled);
      },
      () => {}
    );
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  blob: { position: 'absolute' },
});
