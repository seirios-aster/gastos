import type { ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Shadow = NonNullable<Extract<ViewStyle['boxShadow'], readonly unknown[]>>[number];

/**
 * The pieces that make a surface look like glass, as box shadows. Inset ones are drawn inside the
 * surface, so nothing moves or resizes:
 *  - ring: a thin light outline,
 *  - rim: light catching the top-left edge and a shade on the bottom-right one,
 *  - inner glow: a faint brightness just inside the top edge,
 *  - drop: a soft shadow under the surface that lifts it off the screen.
 */
export function useGlass() {
  const t = useTheme();
  const ring: Shadow = { offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: t.edge, inset: true };
  const rimLight: Shadow = { offsetX: 1, offsetY: 1, blurRadius: 1, color: t.rimLight, inset: true };
  const rimDark: Shadow = { offsetX: -1, offsetY: -1, blurRadius: 1, color: t.rimDark, inset: true };
  const innerGlow: Shadow = { offsetX: 0, offsetY: 10, blurRadius: 20, color: t.innerGlow, inset: true };
  const drop = (offsetY: number, blurRadius: number, color = t.shadow): Shadow => ({
    offsetX: 0,
    offsetY,
    blurRadius,
    color,
  });

  return {
    /** Only the shadow under a surface, for a wrapper that clips its children. */
    drop: { boxShadow: [drop(6, 18)] } as ViewStyle,
    /** Only the parts drawn inside a surface. */
    inset: { boxShadow: [ring, rimLight, rimDark, innerGlow] } as ViewStyle,
    /** Cards and rows. */
    card: { boxShadow: [drop(6, 18), ring, rimLight, rimDark, innerGlow] } as ViewStyle,
    /** Chips, pills and the quieter buttons: small, so no shadow underneath. */
    chip: { boxShadow: [ring, rimLight, rimDark] } as ViewStyle,
    /** The main button: the same, with a soft glow in the accent color underneath. */
    primary: {
      boxShadow: [drop(8, 20, `${t.accent}55`), { ...ring, color: t.accent, spreadDistance: 1.5 }, rimLight, rimDark, innerGlow],
    } as ViewStyle,
    /** A chosen chip, segment or day: the glass tint with an accent-colored ring. */
    selected: {
      boxShadow: [{ ...ring, color: t.accent, spreadDistance: 1.5 }, rimLight, rimDark],
    } as ViewStyle,
    /** Bars and toasts that float over content: a stronger shadow. */
    float: { boxShadow: [drop(10, 26), ring, rimLight, rimDark] } as ViewStyle,
  };
}
