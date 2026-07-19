import { assertEquals, assert } from "@std/assert";
import { getWordSound } from "./getWordSound.ts";
import { has, get as cacheGet, clear } from "../cache/mod.ts";

const API_KEY = "6ab21f277d9e4e2ea3ebf8006e332f9e";

Deno.test({ name: "getWordSound returns a Blob with audio data", ignore: true, permissions: { net: true } }, async () => {
  const blob = await getWordSound(API_KEY, "kat");
  assert(blob instanceof Blob, "Result should be a Blob");
  assert(blob.size > 0, "Blob should have audio data");
});

Deno.test({ name: "getWordSound stores result in shared media cache", ignore: true, permissions: { net: true } }, async () => {
  clear();
  await getWordSound(API_KEY, "hund");
  assert(has("sound:hund"), "Cache should contain the key 'sound:hund'");
  const dataUrl = cacheGet("sound:hund");
  assert(typeof dataUrl === "string", "Cached entry should be a data URL string");
  assert(dataUrl.startsWith("data:audio/mpeg;base64,"), "Data URL should have correct format");
});

Deno.test({ name: "getWordSound returns cached result on second call", ignore: true, permissions: { net: true } }, async () => {
  const first = await getWordSound(API_KEY, "kat");
  const second = await getWordSound(API_KEY, "kat");
  assertEquals(second.size, first.size, "Cached blob should match original");
  assert(has("sound:kat"), "Cache should still contain 'sound:kat'");
});
