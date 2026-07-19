import type { MediaLoader } from "../image/mod.ts";
import { blockify } from "@sauber/block-image";
import { Image } from "@cross/image";
import { getPixels } from "@unpic/pixels";

const TARGET_LINES = 20;
const MASK = "_";
const WRONG = "!";
const FLASH_MS = 300;

/** Fetch image for word, blockify, and print to terminal. */
export async function showImage(
  loader: MediaLoader,
  word: string,
): Promise<void> {
  const jpegBytes = await loader(word);
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
}

/** Print a line of text to stdout. */
export function printLine(text: string): void {
  console.log(text);
}

/** Create an array of underscore slots. */
export function initSlots(count: number): string[] {
  return Array(count).fill(MASK);
}

/** Overwrite the current terminal line with the slot contents. */
export function renderSlots(slots: string[]): void {
  Deno.stdout.writeSync(
    new TextEncoder().encode("\r" + slots.join("") + "  "),
  );
}

/** Briefly flash ! at slot position, then revert to _. */
export async function flashWrong(
  slots: string[],
  pos: number,
): Promise<void> {
  slots[pos] = WRONG;
  renderSlots(slots);
  await new Promise((r) => setTimeout(r, FLASH_MS));
  slots[pos] = MASK;
  renderSlots(slots);
}
