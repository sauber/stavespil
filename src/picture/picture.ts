import { has, get, set } from "../cache/mod.ts";

const CACHE_PREFIX = "image:";

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
 * Fetch a clipart image of a Danish word from Pixabay API with shared media
 * caching.
 *
 * @param apiKey - Pixabay API key
 * @param word - Danish word to fetch image for
 * @returns Base64 data URL of the image
 */
export async function getWordPicture(
  apiKey: string,
  word: string,
): Promise<string> {
  const cacheKey = `${CACHE_PREFIX}${word}`;

  if (has(cacheKey)) {
    const dataUrl = get(cacheKey);
    if (dataUrl) {
      return dataUrl;
    }
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: word,
    image_type: "illustration",
    lang: "da",
    per_page: "3",
  });
  const apiUrl = `https://pixabay.com/api/?${params}`;
  const apiResponse = await fetch(apiUrl);
  if (!apiResponse.ok) {
    throw new Error(`Pixabay API request failed: ${apiResponse.status}`);
  }

  const apiData = await apiResponse.json();
  const hits = apiData.hits;
  if (!hits || hits.length === 0) {
    throw new Error(`No image found for '${word}'`);
  }

  const imageUrl = hits[0].previewURL;
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image download failed: ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  const buffer = await imageResponse.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const dataUrl = bytesToDataUrl(bytes, contentType);
  set(cacheKey, dataUrl);

  return dataUrl;
}

export { dataUrlToBytes };
