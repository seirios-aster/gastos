import { Directory, File, Paths } from 'expo-file-system';
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

/**
 * Let the person pick a folder (Downloads, say) and write the file straight into it, so a copy
 * stays on the phone instead of going to a cloud app. Resolves false if they back out of the
 * folder picker.
 */
export async function saveTextFileToFolder(
  fileName: string,
  content: string,
  mimeType: string
): Promise<boolean> {
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (error) {
    // Backing out of the picker rejects with a "cancelled" error on both platforms.
    if (error instanceof Error && /cancel/i.test(error.message)) return false;
    throw error;
  }
  folder.createFile(fileName, mimeType).write(content);
  return true;
}
