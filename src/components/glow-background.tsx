import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const NONE = '#00000000';

/** The same color fully see-through, so a glow fades out without turning grey. */
const faded = (color: string) => `${color.slice(0, 7)}00`;

/**
 * The soft color glow behind a glass screen: three blurred-looking pools of color near the top
 * left, the right edge and the bottom left. Draws nothing for the solid looks. Put it first inside
 * a screen so everything else lies on top of it.
 */
export function GlowBackground() {
  const theme = useTheme();
  if (theme.glowA === NONE) return null;

  // Two sizes on purpose: React Native reads a gradient with a single size and a position wrongly.
  const pool = (color: string, size: number, at: string) =>
    `radial-gradient(ellipse ${size}px ${size}px at ${at}, ${color}, ${faded(color)})`;
  const image = [
    pool(theme.glowA, 380, '6% 4%'),
    pool(theme.glowB, 340, '104% 44%'),
    pool(theme.glowC, 320, '12% 102%'),
  ].join(', ');

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { experimental_backgroundImage: image } as ViewStyle]}
    />
  );
}
