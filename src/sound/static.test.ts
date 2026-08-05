import { assertEquals, assertRejects } from "@std/assert";
import { soundPath, staticSoundLoader } from "./mod.ts";

Deno.test("soundPath encodes special characters", () => {
  assertEquals(soundPath("kat"), "/sounds/kat.mp3");
  assertEquals(soundPath("på"), "/sounds/p%C3%A5.mp3");
  assertEquals(soundPath("gå"), "/sounds/g%C3%A5.mp3");
});

Deno.test("staticSoundLoader fetches and returns MP3 bytes", async () => {
  const expected = new Uint8Array([0xff, 0xfb, 0x90, 0x64]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: unknown) => {
    assertEquals(String(input), "/sounds/kat.mp3");
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: () => Promise.resolve(expected.buffer),
    });
  }) as unknown as typeof fetch;
  try {
    const bytes = await staticSoundLoader()("kat");
    assertEquals(Array.from(bytes), Array.from(expected));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("staticSoundLoader throws when the file is missing", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve({ ok: false, status: 404 })) as unknown as typeof fetch;
  try {
    await assertRejects(() => staticSoundLoader()("ikkeher"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("staticSoundLoader rejects HTML fallback responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => "text/html" },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    })) as unknown as typeof fetch;
  try {
    await assertRejects(() => staticSoundLoader()("ikkeher"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
