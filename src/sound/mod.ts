/** Function that loads media for a word as raw bytes. */
export type MediaLoader = (word: string) => Promise<Uint8Array>;

export { getWordSound } from "./sound.ts";

import { getWordSound } from "./sound.ts";

/**
 * Create a sound loader function bound to a VoiceRSS API key.
 *
 * Returns a {@link MediaLoader} that fetches Danish pronunciation audio via the
 * VoiceRSS TTS API and returns raw MP3 bytes.
 *
 * @param apiKey - VoiceRSS API key
 * @returns A function that loads sound bytes for a given word
 */
export function soundLoader(apiKey: string): MediaLoader {
  return async (word: string): Promise<Uint8Array> => {
    const blob = await getWordSound(apiKey, word);
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  };
}
