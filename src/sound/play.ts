import { has, get, set, remove } from "../cache/mod.ts";

const CACHE_PREFIX = "sound:";
const WMPLAYER =
  "C:\\Program Files\\Windows Media Player\\wmplayer.exe";

/**
 * Load VOICERSS_API_KEY from the project root .env file.
 */
async function loadApiKey(): Promise<string> {
  const text = await Deno.readTextFile(".env");
  const match = text.match(/^VOICERSS_API_KEY=(.+)$/m);
  if (!match) {
    throw new Error("VOICERSS_API_KEY not found in .env");
  }
  return match[1].trim();
}

/**
 * Fetch pronunciation audio from VoiceRSS API as a data URL.
 */
async function fetchWordSound(
  apiKey: string,
  word: string,
): Promise<string> {
  const url =
    `http://api.voicerss.org/?key=${apiKey}&hl=da-dk&src=${encodeURIComponent(word)}&c=MP3`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`VoiceRSS request failed: ${response.status}`);
  }
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:audio/mpeg;base64,${btoa(binary)}`;
}

/**
 * Decode a base64 data URL to raw bytes.
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * CLI tool and end-to-end integrity test for word sound playback.
 *
 * Exercises the full cache lifecycle:
 * check → fetch → store → read → play → clean up.
 *
 * Usage: `deno task sound <word>`
 */
async function main(): Promise<void> {
  const word = Deno.args[0];
  if (!word) {
    console.error("Usage: deno task sound <word>");
    Deno.exit(1);
  }

  const apiKey = await loadApiKey();
  const cacheKey = `${CACHE_PREFIX}${word}`;

  const wasCached = has(cacheKey);
  console.log(`Cache check for '${word}': ${wasCached ? "HIT" : "MISS"}`);

  if (!wasCached) {
    console.log(`Fetching pronunciation for '${word}'...`);
    const dataUrl = await fetchWordSound(apiKey, word);
    set(cacheKey, dataUrl);
    console.log(`Stored '${word}' in cache`);
  }

  const dataUrl = get(cacheKey);
  if (!dataUrl) {
    throw new Error(`Failed to read '${word}' from cache`);
  }

  const mp3Bytes = dataUrlToBytes(dataUrl);
  const tempFile = await Deno.makeTempFile({ suffix: ".mp3" });
  await Deno.writeFile(tempFile, mp3Bytes);
  console.log(`Wrote temp file: ${tempFile}`);

  console.log(`Playing '${word}'...`);
  const command = new Deno.Command("powershell", {
    args: [
      "-Command",
      `& "${WMPLAYER}" /play /quit "${tempFile}"`,
    ],
  });
  const { code } = await command.output();
  if (code !== 0) {
    console.error(`wmplayer exited with code ${code}`);
  }
  console.log("Playback complete");

  await Deno.remove(tempFile);
  console.log(`Deleted temp file: ${tempFile}`);

  if (!wasCached) {
    remove(cacheKey);
    console.log(`Cleaned up cache entry for '${word}'`);
  }
}

main();
