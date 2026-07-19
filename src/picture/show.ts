import { get, has, remove } from "../cache/mod.ts";
import { dataUrlToBytes, getWordPicture } from "./picture.ts";
import { blockify } from "@sauber/block-image";
import { Image } from "@cross/image";
import { getPixels } from "@unpic/pixels";

const CACHE_PREFIX = "image:";
const TARGET_LINES = 20;

/**
 * Load PIXABAY_API_KEY from the project root .env file.
 */
async function loadApiKey(): Promise<string> {
  const text = await Deno.readTextFile(".env");
  const match = text.match(/^PIXABAY_API_KEY=(.+)$/m);
  if (!match) {
    throw new Error("PIXABAY_API_KEY not found in .env");
  }
  return match[1].trim();
}

/**
 * CLI tool and end-to-end integrity test for word picture display.
 *
 * Exercises the full cache lifecycle:
 * check → fetch → store → read → decode → display.
 *
 * Usage: `deno task image <dansk-ord>`
 */
async function main(): Promise<void> {
  const word = Deno.args[0];
  if (!word) {
    console.error("Usage: deno task image <dansk-ord>");
    Deno.exit(1);
  }

  const apiKey = await loadApiKey();
  const cacheKey = `${CACHE_PREFIX}${word}`;

  const wasCached = has(cacheKey);
  console.log(`Cache check for '${word}': ${wasCached ? "HIT" : "MISS"}`);

  if (!wasCached) {
    console.log(`Fetching image for '${word}'...`);
    await getWordPicture(apiKey, word);
    console.log(`Stored '${word}' in cache`);
  }

  const dataUrl = get(cacheKey);
  if (!dataUrl) {
    throw new Error(`Failed to read '${word}' from cache`);
  }

  const jpegBytes = dataUrlToBytes(dataUrl);
  const { data, width, height } = await getPixels(jpegBytes);

  const aspectRatio = width / height;
  const targetWidth = Math.ceil(TARGET_LINES * aspectRatio) * 2;

  const image = Image.fromRGBA(width, height, data);
  image.resize({
    width: targetWidth,
    height: TARGET_LINES,
    method: "nearest",
    fit: "stretch",
  });

  const ansi = blockify(image.data, image.width, image.height);
  console.log(ansi);
  console.log(`Billeder fra Pixabay`);

  if (!wasCached) {
    remove(cacheKey);
    console.log(`Cleaned up cache entry for '${word}'`);
  }
}

main();
