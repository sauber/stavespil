import { assertEquals, assert, assertStringIncludes } from "@std/assert";
import { getWordPicture, generatePlaceholder } from "./image.ts";
import { has, get as cacheGet, clear } from "../cache/mod.ts";

const API_KEY = "56754611-2f3676f593072d805db4f2c97";

Deno.test("generatePlaceholder returns a valid SVG data URL", () => {
  const dataUrl = generatePlaceholder("kat");
  assert(dataUrl.startsWith("data:image/svg+xml;base64,"));
  const svg = atob(dataUrl.split(",")[1]);
  assertStringIncludes(svg, "<svg");
  assertStringIncludes(svg, "xmlns");
});

Deno.test("generatePlaceholder produces correct dot colors", () => {
  const dataUrl = generatePlaceholder("hej");
  const svg = atob(dataUrl.split(",")[1]);
  assertStringIncludes(svg, "#e74c3c", "vowel 'e' should be red");
  assertStringIncludes(svg, "#3498db", "consonant 'h' and 'j' should be blue");
});

Deno.test("generatePlaceholder produces one circle per letter", () => {
  const dataUrl = generatePlaceholder("ab");
  const svg = atob(dataUrl.split(",")[1]);
  const circleCount = (svg.match(/<circle /g) ?? []).length;
  assertEquals(circleCount, 2);
});

Deno.test("generatePlaceholder handles Danish special characters", () => {
  const dataUrl = generatePlaceholder("æble");
  const svg = atob(dataUrl.split(",")[1]);
  assertStringIncludes(svg, "#e74c3c", "æ and e are vowels");
  assertStringIncludes(svg, "#3498db", "b and l are consonants");
  const circleCount = (svg.match(/<circle /g) ?? []).length;
  assertEquals(circleCount, 4);
});

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

Deno.test({
  name: "getWordPicture falls back to placeholder for unfindable word",
  ignore: true,
  permissions: { net: true },
}, async () => {
  clear();
  const dataUrl = await getWordPicture(API_KEY, "xyzqwerty");
  assert(dataUrl.startsWith("data:image/svg+xml;base64,"),
    "Unfindable word should get SVG placeholder");
  assert(has("image:xyzqwerty"), "Placeholder should be cached");
});
