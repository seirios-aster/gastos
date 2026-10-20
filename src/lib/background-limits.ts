// Limits for the background photo's dimming. Plain data, so the tests can read it.

/** How dark the layer over the photo can be. It never goes below the minimum: text must stay readable. */
export const MIN_DIM = 0.45;
export const MAX_DIM = 0.92;
export const DEFAULT_DIM = 0.62;

export function clampDim(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DIM;
  return Math.min(MAX_DIM, Math.max(MIN_DIM, value));
}

