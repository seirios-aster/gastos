import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { Dimensions, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, { Easing, FadeIn, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors } from '@/constants/theme';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 800;

/** Same size as `imageWidth` in app.json, so the logo does not jump when this takes over from the phone's own splash. */
const LOGO_SIZE = 150;
const BRAND_BLUE = '#208AEF';

export function AnimatedSplashOverlay() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
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

  const background = dark ? Colors.dark.background : BRAND_BLUE;
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

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 76,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
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
