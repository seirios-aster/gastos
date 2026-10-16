import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /**
   * The type scale: caption 12, small 14, default 16, heading 24, subtitle 32, display 40.
   * Bold variants share the size. linkPrimary is small text in the accent color.
   */
  type?:
    | 'caption'
    | 'small'
    | 'smallBold'
    | 'default'
    | 'defaultBold'
    | 'heading'
    | 'subtitle'
    | 'display'
    | 'linkPrimary';
  themeColor?: ThemeColor;
};

/** Add to the style of any amount, so digits are the same width and columns of money line up. */
export const Numeric: TextStyle = { fontVariant: ['tabular-nums'] };

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  // Links use the accent: the old hard-coded blue (#3C87F7) was only 3.5:1 on white.
  const color = themeColor ?? (type === 'linkPrimary' ? 'accent' : 'text');

  return (
    <Text
      style={[
        { color: theme[color] },
        type === 'caption' && styles.caption,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'default' && styles.default,
        type === 'defaultBold' && styles.defaultBold,
        type === 'heading' && styles.heading,
        type === 'subtitle' && styles.subtitle,
        type === 'display' && styles.display,
        type === 'linkPrimary' && styles.linkPrimary,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: 500 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: 700 },
  default: { fontSize: 16, lineHeight: 24, fontWeight: 500 },
  defaultBold: { fontSize: 16, lineHeight: 24, fontWeight: 700 },
  heading: { fontSize: 24, lineHeight: 32, fontWeight: 600 },
  subtitle: { fontSize: 32, lineHeight: 44, fontWeight: 600 },
  display: { fontSize: 40, lineHeight: 48, fontWeight: 700, fontVariant: ['tabular-nums'] },
  linkPrimary: { fontSize: 14, lineHeight: 30 },
});
