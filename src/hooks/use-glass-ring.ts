import type { ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * The thin light ring that edges glass surfaces, drawn inside so nothing moves or resizes.
 * Undefined on the solid looks, so it can always be added to a style list.
 */
export function useGlassRing(): ViewStyle | undefined {
  const theme = useTheme();
  if (theme.edge === '#00000000') return undefined;
  return {
    boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: theme.edge, inset: true }],
  };
}
