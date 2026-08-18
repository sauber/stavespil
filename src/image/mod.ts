/** Function that loads media for a word as raw bytes. */
export type MediaLoader = (word: string) => Promise<Uint8Array>;

export { getWordPicture, dataUrlToBytes, generatePlaceholder } from "./image.ts";

import { getWordPicture, dataUrlToBytes } from "./image.ts";

/**
 * Create an image loader function bound to a Pixabay API key.
 *
 * Returns a {@link MediaLoader} that fetches clipart images for Danish words
 * via the Pixabay API and returns raw image bytes.
 *
 * @param apiKey - Pixabay API key
 * @returns A function that loads image bytes for a given word
 */
export function imageLoader(apiKey: string, verbose = false): MediaLoader {
  return async (word: string): Promise<Uint8Array> => {
    const dataUrl = await getWordPicture(apiKey, word, verbose);
    return dataUrlToBytes(dataUrl);
  };
}
