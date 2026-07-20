import type { MediaLoader } from "../image/mod.ts";
import { blockify } from "@sauber/block-image";
import { Image } from "@cross/image";

const TARGET_LINES = 20;
const MASK = "_";

const FLASH_MS = 300;

function readUint32BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 24) | (data[offset + 1] << 16) |
    (data[offset + 2] << 8) | data[offset + 3];
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

async function decodePngColorType4(
  data: Uint8Array,
): Promise<Image> {
  let pos = 8;
  let width = 0;
  let height = 0;
  const idatChunks: Uint8Array[] = [];

  while (pos < data.length) {
    const length = readUint32BE(data, pos);
    pos += 4;
    const type = String.fromCharCode(
      data[pos], data[pos + 1], data[pos + 2], data[pos + 3],
    );
    pos += 4;
    const chunkData = data.slice(pos, pos + length);
    pos += length;
    pos += 4;

    if (type === "IHDR") {
      width = readUint32BE(chunkData, 0);
      height = readUint32BE(chunkData, 4);
    } else if (type === "IDAT") {
      idatChunks.push(chunkData);
    } else if (type === "IEND") {
      break;
    }
  }

  const totalLen = idatChunks.reduce((s, c) => s + c.length, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of idatChunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const stream = new Response(combined as unknown as BodyInit).body!
    .pipeThrough(new DecompressionStream("deflate"));
  const decompressed = new Uint8Array(
    await new Response(stream).arrayBuffer(),
  );

  const bytesPerPixel = 2;
  const scanlineWidth = width * bytesPerPixel;
  const scanlines: Uint8Array[] = [];
  let dataPos = 0;

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[dataPos++];
    const scanline = new Uint8Array(scanlineWidth);
    for (let x = 0; x < scanlineWidth; x++) {
      scanline[x] = decompressed[dataPos++];
    }

    const prev = y > 0 ? scanlines[y - 1] : null;
    for (let x = 0; x < scanlineWidth; x++) {
      const left = x >= bytesPerPixel ? scanline[x - bytesPerPixel] : 0;
      const above = prev ? prev[x] : 0;
      const upperLeft =
        (x >= bytesPerPixel && prev) ? prev[x - bytesPerPixel] : 0;

      switch (filterType) {
        case 0:
          break;
        case 1:
          scanline[x] = (scanline[x] + left) & 0xff;
          break;
        case 2:
          scanline[x] = (scanline[x] + above) & 0xff;
          break;
        case 3:
          scanline[x] =
            (scanline[x] + Math.floor((left + above) / 2)) & 0xff;
          break;
        case 4:
          scanline[x] =
            (scanline[x] + paethPredictor(left, above, upperLeft)) & 0xff;
          break;
      }
    }
    scanlines.push(scanline);
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sl = scanlines[y];
    for (let x = 0; x < width; x++) {
      const si = x * 2;
      const di = (y * width + x) * 4;
      const gray = sl[si];
      const alpha = sl[si + 1];
      rgba[di] = gray;
      rgba[di + 1] = gray;
      rgba[di + 2] = gray;
      rgba[di + 3] = alpha;
    }
  }

  return Image.fromRGBA(width, height, rgba);
}

function isPng(data: Uint8Array): boolean {
  return data.length >= 8 &&
    data[0] === 137 && data[1] === 80 &&
    data[2] === 78 && data[3] === 71 &&
    data[4] === 13 && data[5] === 10 &&
    data[6] === 26 && data[7] === 10;
}

function getPngColorType(data: Uint8Array): number {
  return data[8 + 4 + 4 + 4 + 4 + 1];
}

async function decodeImage(data: Uint8Array): Promise<Image> {
  if (isPng(data) && getPngColorType(data) === 4) {
    return await decodePngColorType4(data);
  }
  return await Image.decode(data);
}

/** Decode image bytes, resize, and print as block art to terminal. */
export async function showImageBytes(data: Uint8Array): Promise<void> {
  const image = await decodeImage(data);
  const aspectRatio = image.width / image.height;
  const targetWidth = Math.ceil(TARGET_LINES * aspectRatio) * 2;
  image.resize({
    width: targetWidth,
    height: TARGET_LINES,
    method: "nearest",
    fit: "stretch",
  });
  const ansi = blockify(image.data, image.width, image.height);
  console.log(ansi);
}

/** Fetch image for word, blockify, and print to terminal. */
export async function showImage(
  loader: MediaLoader,
  word: string,
): Promise<void> {
  const imageBytes = await loader(word);
  await showImageBytes(imageBytes);
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

/** Briefly flash the typed key at slot position, then revert to _. */
export async function flashWrong(
  slots: string[],
  pos: number,
  ch: string,
): Promise<void> {
  slots[pos] = ch;
  renderSlots(slots);
  await new Promise((r) => setTimeout(r, FLASH_MS));
  slots[pos] = MASK;
  renderSlots(slots);
}
