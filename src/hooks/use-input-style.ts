import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Shared look for text inputs that sit directly on the screen background. */
export function useInputStyle() {
  const theme = useTheme();
  return {
    color: theme.text,
    backgroundColor: theme.backgroundElement,
    borderWidth: 1,
    borderColor: theme.fieldBorder,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.mid,
    fontSize: 16,
  } as const;
}
