import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type ShareFileOptions = {
  mimeType: string;
  /** iOS type identifier, e.g. public.comma-separated-values-text. */
  uti: string;
  dialogTitle: string;
};

/**
 * Write `content` to a temporary file and open the share sheet for it, so the person can save it
 * to Files/Drive, email it or open it in a spreadsheet app. Resolves false if this device can't
 * share files (the caller can fall back to sharing the text).
 */
export async function shareTextFile(
  fileName: string,
  content: string,
  options: ShareFileOptions
): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;

  // The cache folder is cleared by the system when space is low, which is fine for a one-off export.
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);

  await Sharing.shareAsync(file.uri, {
    mimeType: options.mimeType,
    UTI: options.uti,
    dialogTitle: options.dialogTitle,
  });
  return true;
}
