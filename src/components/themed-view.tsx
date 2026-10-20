import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useGlass } from '@/hooks/use-glass';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const glass = useGlass();

  // Cards are glass: a see-through tint with a ring, a rim light, an inner glow and a soft shadow
  // under them. All of it is drawn inside or outside the view, so nothing moves or resizes.
  return (
    <View
      style={[
        { backgroundColor: theme[type ?? 'background'] },
        type === 'backgroundElement' && glass.card,
        style,
      ]}
      {...otherProps}
    />
  );
}
