import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** What a field looks like while it has the keyboard: an accent border and a soft glow round it. */
export function useFocusStyle(focused: boolean): ViewStyle | undefined {
  const theme = useTheme();
  if (!focused) return undefined;
  return {
    borderColor: theme.accent,
    boxShadow: [
      { offsetX: 0, offsetY: 2, blurRadius: 5, color: theme.fieldInset, inset: true },
      { offsetX: 0, offsetY: 0, blurRadius: 12, spreadDistance: 1, color: `${theme.accent}66` },
    ],
  };
}

// The style keys that belong to the text itself; everything else styles the box around it.
const TEXT_KEYS = [
  'color',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textAlign',
] as const;

/**
 * A TextInput that lights up while it is being typed in, so it is clear which field has the
 * keyboard. Use it exactly like TextInput.
 *
 * The field's look (fill, border, padding, shadow) is drawn on a box around the input, and the
 * input inside is bare. Android drops an EditText's padding when a shadow drawable is set on it
 * directly, which left the text touching the left border.
 */
export function FocusInput({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const focus = useFocusStyle(focused);

  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const text: Record<string, unknown> = {};
  const box: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if ((TEXT_KEYS as readonly string[]).includes(key)) text[key] = value;
    else box[key] = value;
  }

  return (
    <View style={[box as ViewStyle, styles.box, focus]}>
      <TextInput
        {...rest}
        style={[styles.input, text as TextStyle]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minWidth: 0, padding: 0, margin: 0, textAlignVertical: 'center' },
});
