/**
 * Taking a picture of the whole screen, for the light/dark fade (src/components/theme-transition.tsx).
 * Uses react-native-view-shot, which Expo Go includes. The browser preview gets screen-picture.web.ts
 * instead, so this module (and its web-only extras) never reaches the web bundle.
 */

type ViewShotModule = typeof import('react-native-view-shot');

/** undefined = not tried yet, null = not available. */
let viewShot: ViewShotModule | null | undefined;

/**
 * Loaded on first use instead of at the top of the file: if the native part were ever missing,
 * importing it would crash the whole app at startup, and here it only switches the fade off.
 */
function getViewShot(): ViewShotModule | null {
  if (viewShot !== undefined) return viewShot;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- on purpose, see above
    viewShot = require('react-native-view-shot') as ViewShotModule;
  } catch (error) {
    console.warn('The theme fade is off: the screenshot module is not available', error);
    viewShot = null;
  }
  return viewShot;
}

/** Take a picture of the screen. Resolves with the address of a temporary file; rejects if it cannot. */
export async function takeScreenPicture(): Promise<string> {
  const module = getViewShot();
  if (!module) throw new Error('react-native-view-shot is not available');
  // JPEG is far quicker to save than PNG, and nobody can see the difference during a 300 ms fade.
  return module.captureScreen({ format: 'jpg', quality: 0.8, result: 'tmpfile' });
}

/** Delete a picture made by takeScreenPicture. */
export function deleteScreenPicture(uri: string) {
  try {
    getViewShot()?.releaseCapture(uri);
  } catch {
    // The phone clears its cache folder anyway.
  }
}
