import { has, remove } from "../cache/mod.ts";
import { imageLoader } from "./mod.ts";
import { printLine, showImage } from "../cli/mod.ts";

const CACHE_PREFIX = "image:";

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
  printLine(`Cache check for '${word}': ${wasCached ? "HIT" : "MISS"}`);

  if (!wasCached) {
    printLine(`Fetching image for '${word}'...`);
  }

  const loader = imageLoader(apiKey);
  await showImage(loader, word);
  printLine("Billeder fra Pixabay");

  if (!wasCached) {
    remove(cacheKey);
    printLine(`Cleaned up cache entry for '${word}'`);
  }
}

main();
