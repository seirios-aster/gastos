/** The browser preview cannot take screen pictures; the theme there changes instantly. */
export async function takeScreenPicture(): Promise<string> {
  throw new Error('Screen pictures are not available in the browser preview');
}

export function deleteScreenPicture() {}
