/**
 * Read the text lines off a receipt photo, or return null when this build has no OCR engine.
 *
 * Expo Go cannot load native text-recognition, so for now this always returns null and the app
 * falls back to showing the photo while the user types the total. The full app build swaps the
 * body of this function for an on-device engine; nothing else needs to change.
 */
export async function readReceiptLines(_uri: string): Promise<string[] | null> {
  return null;
}
