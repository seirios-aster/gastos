import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useAppWarm } from '@/lib/app-warm';

/** How long the splash lifts away once the app is ready. */
const LIFT_MS = 480;
/** It stays at least this long, so the name is readable before it leaves. */
const MIN_SHOWN_MS = 700;
/** If the app is not ready by then, leave anyway: a loader must never get stuck. */
const MAX_SHOWN_MS = 5000;

/** Same size as `imageWidth` in app.json, so the logo does not jump when this takes over from the phone's own splash. */
const LOGO_SIZE = 190;
/** The splash backdrop: sky blue, the same as `backgroundColor` for the splash in app.json. */
const SPLASH_BACKGROUND = '#4A9BEE';

export function AnimatedSplashOverlay() {
  const warm = useAppWarm();
  const [visible, setVisible] = useState(true);
  const [shownLongEnough, setShownLongEnough] = useState(false);
  const [giveUp, setGiveUp] = useState(false);
  const lift = useSharedValue(0);

  useEffect(() => {
    const minimum = setTimeout(() => setShownLongEnough(true), MIN_SHOWN_MS);
    const maximum = setTimeout(() => setGiveUp(true), MAX_SHOWN_MS);
    return () => {
      clearTimeout(minimum);
      clearTimeout(maximum);
    };
  }, []);

  // It acts as the loader: it stays until the app has opened every tab once (and a moment longer),
  // then lifts away into the app.
  const leaving = (warm && shownLongEnough) || giveUp;
  useEffect(() => {
    if (!leaving) return;
    lift.set(
      withTiming(1, { duration: LIFT_MS, easing: Easing.in(Easing.quad) }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      })
    );
  }, [leaving, lift]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - lift.get(),
    transform: [{ translateY: -24 * lift.get() }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      // Once this is drawn, the phone's own splash can go: it looks the same, so nothing jumps.
      onLayout={() => {
        void SplashScreen.hideAsync();
      }}
      style={[styles.splashOverlay, { backgroundColor: SPLASH_BACKGROUND }, style]}>
      <Image style={styles.logo} source={require('@/assets/images/splash-icon.png')} />
      <Animated.View entering={FadeIn.duration(200)} style={styles.nameWrap}>
        <Text style={styles.name}>Gastos</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  // Hangs below the logo without moving it, so the logo stays where the phone's splash drew it.
  nameWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: LOGO_SIZE / 2 + 4,
  },
  name: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', letterSpacing: 0.5 },
});
