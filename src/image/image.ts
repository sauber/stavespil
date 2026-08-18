import { has, get, set } from "../cache/mod.ts";

const CACHE_PREFIX = "image:";

const VOWELS = new Set("aeiouyæøå");

type SearchStep = {
  imageType?: string;
  lang?: string;
  perPage: number;
};

const SEARCH_STEPS: SearchStep[] = [
  { imageType: "illustration", lang: "da", perPage: 3 },
  { lang: "da", perPage: 3 },
  { perPage: 3 },
];

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
 * Convert raw bytes to a base64 data URL.
 */
function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * Query the Pixabay API with given filters.
 *
 * @returns The previewURL of the first hit, or null if no results or HTTP error.
 */
async function queryPixabay(
  apiKey: string,
  word: string,
  step: SearchStep,
): Promise<string | null> {
  const params = new URLSearchParams({ key: apiKey, q: word });
  if (step.imageType) params.set("image_type", step.imageType);
  if (step.lang) params.set("lang", step.lang);
  params.set("per_page", String(step.perPage));

  const apiUrl = `https://pixabay.com/api/?${params}`;
  const apiResponse = await fetch(apiUrl);
  if (!apiResponse.ok) {
    return null;
  }

  const apiData = await apiResponse.json();
  const hits = apiData.hits;
  if (!hits || hits.length === 0) {
    return null;
  }
  return hits[0].previewURL;
}

/**
 * Generate an SVG placeholder image for a word.
 *
 * Displays a row of colored dots: red for vowels, blue for consonants.
 */
function generatePlaceholder(word: string): string {
  const letters = [...word.toLowerCase()];
  const r = 12;
  const gap = 8;
  const totalWidth = letters.length * (r * 2) + (letters.length - 1) * gap;
  const svgWidth = Math.max(totalWidth + 20, 60);
  const svgHeight = 60;
  const startX = (svgWidth - totalWidth) / 2 + r;
  const cy = svgHeight / 2;

  const circles = letters
    .map((ch, i) => {
      const color = VOWELS.has(ch) ? "#e74c3c" : "#3498db";
      const cx = startX + i * (r * 2 + gap);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}"><rect width="100%" height="100%" fill="#f0f4ff" rx="8"/>${circles}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Fetch a clipart image of a Danish word from Pixabay API with shared media
 * caching.
 *
 * Tries progressively broader search filters before falling back to a
 * placeholder SVG with colored dots (red = vowel, blue = consonant).
 *
 * @param apiKey - Pixabay API key
 * @param word - Danish word to fetch image for
 * @returns Base64 data URL of the image
 */
export async function getWordPicture(
  apiKey: string,
  word: string,
  verbose = false,
): Promise<string> {
  const cacheKey = `${CACHE_PREFIX}${word}`;

  if (has(cacheKey)) {
    const dataUrl = get(cacheKey);
    if (dataUrl) {
      if (verbose) {
        console.log(`Cache key: ${cacheKey}`);
        console.log(`Image size: ${dataUrl.length} bytes (data URL)`);
      }
      return dataUrl;
    }
  }

  for (const step of SEARCH_STEPS) {
    const imageUrl = await queryPixabay(apiKey, word, step);
    if (imageUrl) {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Image download failed: ${imageResponse.status}`);
      }

      const contentType =
        imageResponse.headers.get("content-type") ?? "image/jpeg";
      const buffer = await imageResponse.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const dataUrl = bytesToDataUrl(bytes, contentType);
      set(cacheKey, dataUrl);

      if (verbose) {
        console.log(
          `Image found via: image_type=${step.imageType ?? "(any)"} lang=${step.lang ?? "(any)"}`,
        );
        console.log(`First image URL: ${imageUrl}`);
        console.log(`Image size: ${buffer.byteLength} bytes`);
        console.log(`Cache key: ${cacheKey}`);
      }

      return dataUrl;
    }
  }

  if (verbose) {
    console.log(`No image found for '${word}', using placeholder`);
  }

  const dataUrl = generatePlaceholder(word);
  set(cacheKey, dataUrl);
  return dataUrl;
}

export { dataUrlToBytes, generatePlaceholder };
