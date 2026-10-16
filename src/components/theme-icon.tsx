import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  /** True in dark mode: the sun shows (tap to go light). False in light mode: the moon shows. */
  dark: boolean;
  color: string;
  size?: number;
};

/** The moon and the sun, stacked. Changing `dark` turns one out and the other in (spin, shrink, fade). */
export function ThemeIcon({ dark, color, size = 24 }: Props) {
  // 0 = the moon is showing, 1 = the sun is showing; in between, the two are swapping places.
  const progress = useSharedValue(dark ? 1 : 0);

  useEffect(() => {
    // A long, gentle ease: the first moments hardly move, so little is lost while the theme fade
    // still covers the toggle. Phones that ask for less motion get a jump instead.
    progress.set(withTiming(dark ? 1 : 0, { duration: 500, easing: Easing.inOut(Easing.cubic) }));
  }, [dark, progress]);

  const moonStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: interpolate(p, [0, 0.6], [1, 0], Extrapolation.CLAMP),
      transform: [
        { rotate: `${interpolate(p, [0, 1], [0, 90])}deg` },
        { scale: interpolate(p, [0, 1], [1, 0.4]) },
      ],
    };
  });

  const sunStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: interpolate(p, [0.4, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { rotate: `${interpolate(p, [0, 1], [-90, 0])}deg` },
        { scale: interpolate(p, [0, 1], [0.4, 1]) },
      ],
    };
  });

  return (
    // The button around the icon carries the label; the pictures themselves say nothing extra.
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, moonStyle]}>
        <SymbolView
          tintColor={color}
          name={{ ios: 'moon', android: 'dark_mode', web: 'dark_mode' }}
          size={size}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, sunStyle]}>
        <SymbolView
          tintColor={color}
          name={{ ios: 'sun.max', android: 'light_mode', web: 'light_mode' }}
          size={size}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
