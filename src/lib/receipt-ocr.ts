/**
 * Read the text lines off a receipt photo with Google ML Kit, which runs on the phone itself.
 * Returns null when this build has no text-recognition code (Expo Go) or recognition fails, and
 * the caller falls back to showing the photo while the user types the total.
 */
export async function readReceiptLines(uri: string): Promise<string[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default as {
      recognize: (uri: string) => Promise<{ blocks: { lines: { text: string }[] }[] }>;
    };
    const result = await TextRecognition.recognize(uri);
    const lines = result.blocks.flatMap((block) => block.lines.map((line) => line.text));
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  }
}
