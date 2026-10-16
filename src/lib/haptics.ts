import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Small taps for the phone's vibration motor. Every call swallows its errors: the motor can be off
 * (MIUI's "vibrate on touch"), missing (web), or busy, and a missed buzz must never break a button.
 */
async function run(buzz: () => Promise<void>) {
  try {
    await buzz();
  } catch {
    // Nothing to do.
  }
}

/**
 * Android's own haptic effects feel like the system's (and need no vibrate permission), but a
 * phone only supports some of them: an unsupported one throws, so try the next, and finally the
 * generic buzz that every phone and iOS can do.
 */
async function android(types: Haptics.AndroidHaptics[], fallback: () => Promise<void>) {
  if (Platform.OS === 'android') {
    for (const type of types) {
      try {
        await Haptics.performAndroidHapticsAsync(type);
        return;
      } catch {
        // Not supported on this phone; try the next one.
      }
    }
  }
  await fallback();
}

/** A light tick for choosing an option (segments, chips, the theme switch). */
export const tick = () =>
  run(() =>
    android(
      [Haptics.AndroidHaptics.Segment_Tick, Haptics.AndroidHaptics.Clock_Tick],
      () => Haptics.selectionAsync()
    )
  );

/** A firm tap for pressing a main button. */
export const tap = () =>
  run(() =>
    android([Haptics.AndroidHaptics.Context_Click], () =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    )
  );

/** Something was saved. */
export const success = () =>
  run(() =>
    android([Haptics.AndroidHaptics.Confirm], () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    )
  );
