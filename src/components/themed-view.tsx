import { View, type ViewProps, type ViewStyle } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  // On the glass look, cards get a thin light ring (drawn inside, so nothing moves or resizes).
  const ring: ViewStyle | undefined =
    type === 'backgroundElement' && theme.edge !== '#00000000'
      ? { boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: theme.edge, inset: true }] }
      : undefined;

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, ring, style]} {...otherProps} />;
}
