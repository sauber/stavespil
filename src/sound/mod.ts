/** Function that loads media for a word as raw bytes. */
export type MediaLoader = (word: string) => Promise<Uint8Array>;

/** URL-relative path to the pre-generated MP3 file for a word. */
export function soundPath(word: string): string {
  return `/sounds/${encodeURIComponent(word)}.mp3`;
}

/**
 * Create a sound loader bound to the pre-generated static sound files.
 *
 * Returns a {@link MediaLoader} that fetches `/sounds/<word>.mp3` and returns
 * the raw MP3 bytes. Sounds are generated once by `deno task sound:download`
 * (Microsoft Edge neural voices) and served by the web server, so no API key
 * or runtime TTS call is required.
 */
export function staticSoundLoader(): MediaLoader {
  return async (word: string): Promise<Uint8Array> => {
    const response = await fetch(soundPath(word));
    if (!response.ok) {
      throw new Error(`Sound not found for '${word}' (${response.status})`);
    }
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("audio/")) {
      throw new Error(`Sound for '${word}' is not audio (${type || "unknown type"})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  };
}
