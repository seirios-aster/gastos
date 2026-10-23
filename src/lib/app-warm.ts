import { useSyncExternalStore } from 'react';

/**
 * Whether the tabs have all been opened once after startup. The splash screen stays up until they
 * have, so it doubles as the loader and nothing visible happens behind it.
 */
let warm = false;
const listeners = new Set<() => void>();

export function markWarm() {
  if (warm) return;
  warm = true;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppWarm(): boolean {
  return useSyncExternalStore(subscribe, () => warm, () => warm);
}
