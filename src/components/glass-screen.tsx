import { BlurTargetView } from 'expo-blur';
import { createContext, useRef, type RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GlowBackground } from '@/components/glow-background';
import { useTheme } from '@/hooks/use-theme';

/**
 * The view that a frosted panel blurs. On Android a blur needs to be told which view sits behind
 * it, so every screen (and sheet) shares one: the colored shapes drawn behind its content.
 */
export const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

type Props = { style?: StyleProp<ViewStyle>; children: React.ReactNode };

/**
 * A screen with the glass backdrop. The colored shapes live in a blur target at the back;
 * frosted panels on top of it (see FrostLayer) blur exactly what lies behind them.
 */
export function GlassScreen({ style, children }: Props) {
  const theme = useTheme();
  const target = useRef<View | null>(null);

  return (
    <BlurTargetContext.Provider value={target}>
      <View style={[{ backgroundColor: theme.background }, style]}>
        {/* The target needs the screen color as its own background: a blur samples only what is
            inside it, and transparent pixels blur to a pale grey instead of the dark screen. */}
        <BlurTargetView
          ref={target}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
          <GlowBackground />
        </BlurTargetView>
        {children}
      </View>
    </BlurTargetContext.Provider>
  );
}
