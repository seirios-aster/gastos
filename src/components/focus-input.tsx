import { useState } from 'react';
import { TextInput, type TextInputProps, type ViewStyle } from 'react-native';

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

/**
 * A TextInput that lights up while it is being typed in, so it is clear which field has the
 * keyboard. Use it exactly like TextInput.
 */
export function FocusInput({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const focus = useFocusStyle(focused);

  return (
    <TextInput
      {...rest}
      style={[style, focus]}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
    />
  );
}
