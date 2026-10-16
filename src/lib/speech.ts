type SpeechModule = typeof import('expo-speech-recognition');

let cached: SpeechModule | null | undefined;

/**
 * The native speech-recognition module, or null when this build does not include it (Expo Go).
 * Loaded lazily inside try/catch because importing it without the native code throws.
 */
export function loadSpeech(): SpeechModule | null {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('expo-speech-recognition') as SpeechModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}
