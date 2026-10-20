import { View, type ViewProps } from 'react-native';

import { FrostLayer } from '@/components/frost-layer';
import { ThemeColor } from '@/constants/theme';
import { useGlass } from '@/hooks/use-glass';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** Frost what lies behind this card (a real blur). Use it on big cards, not on every row of a list. */
  blur?: boolean;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type,
  blur = false,
  children,
  ...otherProps
}: ThemedViewProps) {
  const theme = useTheme();
  const glass = useGlass();

  // Cards are glass: a see-through tint with a ring, a rim light, an inner glow and a soft shadow
  // under them. All of it is drawn inside or outside the view, so nothing moves or resizes.
  return (
    <View
      style={[
        { backgroundColor: theme[type ?? 'background'] },
        type === 'backgroundElement' && glass.card,
        blur && { overflow: 'hidden' },
        style,
      ]}
      {...otherProps}>
      {blur ? <FrostLayer /> : null}
      {children}
    </View>
  );
}
