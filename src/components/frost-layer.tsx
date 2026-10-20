import { BlurView } from 'expo-blur';
import { useContext } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { BlurTargetContext } from '@/components/glass-screen';

/**
 * Set to false to go back to plain see-through tints with no blur, if blur ever feels slow on a
 * phone. Everything else keeps working.
 */
export const BLUR_ENABLED = true;

/** How strongly the shapes behind a panel are blurred (1 to 100). */
const INTENSITY = 55;

/**
 * Drop this as the first child of a panel (a view with `overflow: 'hidden'` and rounded corners)
 * to frost what lies behind it. Draws nothing outside a GlassScreen, or on an old Android that
 * cannot blur efficiently, so the panel simply stays a see-through tint there.
 */
export function FrostLayer() {
  const target = useContext(BlurTargetContext);
  const dark = useColorScheme() === 'dark';
  if (!BLUR_ENABLED || !target) return null;
  return (
    <BlurView
      blurTarget={target}
      intensity={INTENSITY}
      // A tint is always added on top of the blur; match it to the theme so the panel does not go grey.
      tint={dark ? 'dark' : 'light'}
      // Only phones on Android 12 or newer blur efficiently; older ones keep the tint.
      blurMethod="dimezisBlurViewSdk31Plus"
      pointerEvents="none"
      // Behind the panel's content (on the web an absolute layer would otherwise paint over inputs).
      style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
    />
  );
}
