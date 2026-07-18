import { has, get, set } from "../cache/mod.ts";

const CACHE_PREFIX = "sound:";

function dataUrlToBlob(dataUrl: string): Blob {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: "audio/mpeg" });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:audio/mpeg;base64,${btoa(binary)}`;
}

/**
 * Fetches audio of a Danish word from VoiceRSS API with shared media caching.
 *
 * @param apiKey - VoiceRSS API key
 * @param word - Danish word to fetch pronunciation for
 * @returns Audio blob in MP3 format
 */
export async function getWordSound(apiKey: string, word: string): Promise<Blob> {
  const cacheKey = `${CACHE_PREFIX}${word}`;

  if (has(cacheKey)) {
    const dataUrl = get(cacheKey);
    if (dataUrl) {
      return dataUrlToBlob(dataUrl);
    }
  }

  const url = `http://api.voicerss.org/?key=${apiKey}&hl=da-dk&src=${encodeURIComponent(word)}&c=MP3`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`VoiceRSS request failed: ${response.status}`);
  }

  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  set(cacheKey, dataUrl);

  return blob;
}
