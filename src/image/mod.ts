import type { MediaLoader } from "../gameState/mod.ts";
import { CACHE_PREFIX } from "./image.ts";

export type { MediaLoader };
export { CACHE_PREFIX };
export { getWordPicture, dataUrlToBytes, generatePlaceholder } from "./image.ts";

import { getWordPicture, dataUrlToBytes } from "./image.ts";

/**
 * Load PIXABAY_API_KEY from the project root .env file.
 */
export async function loadApiKey(): Promise<string> {
  const text = await Deno.readTextFile(".env");
  const match = text.match(/^PIXABAY_API_KEY=(.+)$/m);
  if (!match) {
    throw new Error("PIXABAY_API_KEY not found in .env");
  }
  return match[1].trim();
}

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
