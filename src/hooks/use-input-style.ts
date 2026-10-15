import { useTheme } from '@/hooks/use-theme';

/** Shared look for text inputs that sit directly on the screen background. */
export function useInputStyle() {
  const theme = useTheme();
  return {
    color: theme.text,
    backgroundColor: theme.backgroundElement,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  } as const;
}
