import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors } from '@/constants/theme';

const DURATION = 800;

/** Same size as `imageWidth` in app.json, so the logo does not jump when this takes over from the phone's own splash. */
const LOGO_SIZE = 160;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  // Holds still for a moment while the name fades in, then lifts away into the app.
  const leaveKeyframe = new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }] },
    40: { opacity: 1, transform: [{ translateY: 0 }] },
    100: {
      opacity: 0,
      transform: [{ translateY: -24 }],
      easing: Easing.in(Easing.quad),
    },
  });

  // Black in both themes, like the phone's own splash, so the two look like one screen.
  const background = Colors.dark.background;
  const logo = (
    <Image style={styles.logo} source={require('@/assets/images/splash-icon.png')} />
  );

  return animate ? (
    <Animated.View
      entering={leaveKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={[styles.splashOverlay, { backgroundColor: background }]}>
      {logo}
      <Animated.View entering={FadeIn.duration(200)} style={styles.nameWrap}>
        <Text style={styles.name}>Gastos</Text>
      </Animated.View>
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={[styles.splashOverlay, { backgroundColor: background }]}>
      {logo}
    </View>
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
