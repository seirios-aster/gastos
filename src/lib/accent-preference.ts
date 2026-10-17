import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { DEFAULT_ACCENT, isHex } from '@/constants/accent';

const ACCENT_KEY = 'accent';

let current: string | undefined;
const listeners = new Set<() => void>();

/** The color the person picked, or the default. Read from storage the first time it is asked for. */
export function getAccent(): string {
  if (current === undefined) {
    try {
      const saved = Storage.getItemSync(ACCENT_KEY);
      current = isHex(saved) ? saved.toUpperCase() : DEFAULT_ACCENT;
    } catch {
      current = DEFAULT_ACCENT;
    }
  }
  return current;
}

/** Use this color everywhere and remember it. Anything that is not a #rrggbb color is ignored. */
export function setAccent(hex: string) {
  if (!isHex(hex)) return;
  current = hex.toUpperCase();
  try {
    if (current === DEFAULT_ACCENT) Storage.removeItemSync(ACCENT_KEY);
    else Storage.setItemSync(ACCENT_KEY, current);
  } catch (error) {
    console.warn('Could not save the color', error);
  }
  listeners.forEach((listener) => listener());
}

export function resetAccent() {
  setAccent(DEFAULT_ACCENT);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current accent, re-rendering the component whenever it changes. */
export function useAccent(): string {
  return useSyncExternalStore(subscribe, getAccent, getAccent);
}
