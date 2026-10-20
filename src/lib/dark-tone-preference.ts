import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { DARK_TONES, DEFAULT_DARK_TONE, type DarkToneName } from '@/constants/neutrals';

const TONE_KEY = 'dark_tone';

let current: DarkToneName | undefined;
const listeners = new Set<() => void>();

function isTone(value: unknown): value is DarkToneName {
  return typeof value === 'string' && value in DARK_TONES;
}

/** Which dark surfaces are in use: the saved choice, or the default. */
export function getDarkTone(): DarkToneName {
  if (current === undefined) {
    try {
      const saved = Storage.getItemSync(TONE_KEY);
      current = isTone(saved) ? saved : DEFAULT_DARK_TONE;
    } catch {
      current = DEFAULT_DARK_TONE;
    }
  }
  return current;
}

export function setDarkTone(tone: DarkToneName) {
  current = tone;
  try {
    if (tone === DEFAULT_DARK_TONE) Storage.removeItemSync(TONE_KEY);
    else Storage.setItemSync(TONE_KEY, tone);
  } catch (error) {
    console.warn('Could not save the dark tone', error);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDarkTone(): DarkToneName {
  return useSyncExternalStore(subscribe, getDarkTone, getDarkTone);
}
