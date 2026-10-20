import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shared look for text inputs. They must read as fields at a glance on glass, so they are a darker
 * well sunk into the surface: a recessed fill, a clear 1.5dp border and a shadow inside the top.
 */
export function useInputStyle() {
  const theme = useTheme();
  return {
    color: theme.text,
    backgroundColor: theme.field,
    borderWidth: 1.5,
    borderColor: theme.fieldBorder,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.mid,
    fontSize: 16,
    boxShadow: [
      { offsetX: 0, offsetY: 2, blurRadius: 5, color: theme.fieldInset, inset: true },
      { offsetX: 0, offsetY: 1, blurRadius: 0, color: theme.rimLight, inset: false },
    ],
  } as const;
}
