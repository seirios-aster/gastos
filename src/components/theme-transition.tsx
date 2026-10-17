import { Image } from 'expo-image';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/hooks/use-theme';
import { deleteScreenPicture, takeScreenPicture } from '@/lib/screen-picture';
import {
  currentTheme,
  onThemeReported,
  setTheme,
  type ThemeChoice,
} from '@/lib/theme-preference';
import { FADE_MS, ThemeTransition } from '@/lib/theme-transition';

/**
 * Smooth light/dark switching.
 *
 * Android cannot animate a theme change: the whole app repaints in one go. So before switching we
 * take a picture of the screen, lay it over the app, switch underneath it, and fade the picture
 * away. The when-and-in-what-order lives in src/lib/theme-transition.ts (and is tested there);
 * this file plugs in the real screenshot, timers and animation.
 *
 * It needs react-native-view-shot (`npx expo install react-native-view-shot`; Expo Go includes
 * it). If that is missing or anything fails, the theme simply changes instantly, as before.
 */

/** Whether the phone asks apps to avoid animations. Kept up to date by watchReduceMotion(). */
let reduceMotionOn = false;

/** Start following the phone's "reduce motion" setting. Returns a function that stops. */
function watchReduceMotion(): () => void {
  let active = true;
  AccessibilityInfo.isReduceMotionEnabled().then(
    (enabled) => {
      if (active) reduceMotionOn = enabled;
    },
    () => {}
  );
  const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    reduceMotionOn = enabled;
  });
  return () => {
    active = false;
    subscription.remove();
  };
}

/** Run `fn` after `count` screen frames. */
function afterFrames(count: number, fn: () => void): () => void {
  let left = count;
  let id = 0;
  const step = () => {
    left -= 1;
    if (left <= 0) fn();
    else id = requestAnimationFrame(step);
  };
  id = requestAnimationFrame(step);
  return () => cancelAnimationFrame(id);
}

function after(ms: number, fn: () => void): () => void {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
}

type ThemeTransitionValue = {
  /** Switch to this theme with a fade. Falls back to an instant switch whenever the fade is not possible. */
  changeTheme: (next: ThemeChoice) => void;
  /**
   * Call when the finger touches the toggle, before the tap is complete: the screen picture is taken
   * then, so the fade can start the moment the finger lifts.
   */
  prepareChange: () => void;
  /** Call when the touch ended without a tap (the finger slid away): drops the early picture. */
  cancelPrepare: () => void;
};

const ThemeTransitionContext = createContext<ThemeTransitionValue>({
  changeTheme: setTheme,
  prepareChange: () => {},
  cancelPrepare: () => {},
});

export function useThemeTransition() {
  return useContext(ThemeTransitionContext);
}

/**
 * Put this around the whole app, inside the providers that supply the theme. It adds one View
 * (filling the screen, painted in the theme's background colour) and the cover on top of everything.
 */
export function ThemeTransitionProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const opacity = useSharedValue(1);
  const [cover, setCover] = useState<string | null>(null);

  // Built once. Every function inside only runs when called, never while rendering.
  const [transition] = useState(
    () =>
      new ThemeTransition({
        current: currentTheme,
        reduceMotion: () => reduceMotionOn,
        capture: takeScreenPicture,
        release: deleteScreenPicture,
        apply: setTheme,
        listenForTheme: onThemeReported,
        afterFrames,
        after,
        setCover: (uri) => {
          // Fully opaque before the picture exists, so its very first frame already hides the app.
          if (uri) opacity.set(1);
          setCover(uri);
        },
        startFade: (done) => {
          opacity.set(
            withTiming(
              0,
              {
                duration: FADE_MS,
                // Moves right away. If the new theme is a frame late the picture underneath is still
                // the old theme, so an early start shows nothing odd; a slow start only felt like lag.
                easing: Easing.out(Easing.quad),
                // The decision to animate or not was made in ThemeTransition.request().
                reduceMotion: ReduceMotion.Never,
              },
              (finished) => {
                'worklet';
                if (finished) scheduleOnRN(done);
              }
            )
          );
        },
      })
  );

  useEffect(() => watchReduceMotion(), []);

  useEffect(() => () => transition.dispose(), [transition]);

  const value = useMemo<ThemeTransitionValue>(
    () => ({
      // The browser preview cannot take screen pictures (and has no way to switch theme by hand either).
      changeTheme: (next) => (Platform.OS === 'web' ? setTheme(next) : transition.request(next)),
      prepareChange: () => {
        if (Platform.OS !== 'web') transition.prepare();
      },
      cancelPrepare: () => transition.cancelPrepare(),
    }),
    [transition]
  );

  return (
    <ThemeTransitionContext.Provider value={value}>
      {/* Painted in the theme's own background, so a gap can never show the phone's default white or grey. */}
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        {children}
        {cover ? (
          <Cover
            uri={cover}
            opacity={opacity}
            onDisplay={() => transition.coverShown()}
            onError={() => transition.coverFailed()}
          />
        ) : null}
      </View>
    </ThemeTransitionContext.Provider>
  );
}

type CoverProps = {
  uri: string;
  opacity: SharedValue<number>;
  onDisplay: () => void;
  onError: () => void;
};

/** The picture of the old theme, lying over everything. It never takes touches, so it can never trap the user. */
function Cover({ uri, opacity, onDisplay, onError }: CoverProps) {
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, animatedStyle]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="fill"
        // No fade-in: it has to replace the live screen in a single frame.
        transition={null}
        // A one-off file; keeping it in the image cache would only waste memory.
        cachePolicy="none"
        onDisplay={onDisplay}
        onError={onError}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
