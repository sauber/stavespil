import { assertEquals, assert } from "@std/assert";
import { getWordPicture } from "./getWordPicture.ts";
import { has, get as cacheGet, clear } from "../cache/mod.ts";

const API_KEY = "56754611-2f3676f593072d805db4f2c97";

Deno.test({
  name: "getWordPicture returns a data URL with image data",
  ignore: true,
  permissions: { net: true },
}, async () => {
  const dataUrl = await getWordPicture(API_KEY, "kat");
  assert(typeof dataUrl === "string", "Result should be a string");
  assert(dataUrl.startsWith("data:image/"), "Data URL should start with data:image/");
  assert(dataUrl.includes(";base64,"), "Data URL should contain base64 marker");
});

Deno.test({
  name: "getWordPicture stores result in shared media cache",
  ignore: true,
  permissions: { net: true },
}, async () => {
  clear();
  await getWordPicture(API_KEY, "hund");
  assert(has("image:hund"), "Cache should contain the key 'image:hund'");
  const dataUrl = cacheGet("image:hund");
  assert(typeof dataUrl === "string", "Cached entry should be a data URL string");
  assert(dataUrl.startsWith("data:image/"), "Data URL should have correct format");
});

Deno.test({
  name: "getWordPicture returns cached result on second call",
  ignore: true,
  permissions: { net: true },
}, async () => {
  const first = await getWordPicture(API_KEY, "kat");
  const second = await getWordPicture(API_KEY, "kat");
  assertEquals(second, first, "Cached result should match original");
  assert(has("image:kat"), "Cache should still contain 'image:kat'");
});
