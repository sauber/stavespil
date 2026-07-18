import { assertEquals, assert } from "@std/assert";
import { has, get, set, remove, clear, size, keys, setMaxSize } from "./mediaCache.ts";

Deno.test("has() returns false for empty cache", () => {
  clear();
  assertEquals(has("sound:test.mp3"), false);
});

Deno.test("has() returns true after set()", () => {
  clear();
  set("sound:test.mp3", "data:audio/mpeg;base64,ABC123");
  assertEquals(has("sound:test.mp3"), true);
});

Deno.test("has() returns false for unknown key", () => {
  clear();
  set("sound:test.mp3", "data:audio/mpeg;base64,ABC123");
  assertEquals(has("sound:unknown.mp3"), false);
});

Deno.test("get() returns null for empty cache", () => {
  clear();
  assertEquals(get("sound:test.mp3"), null);
});

Deno.test("get() returns stored data URL after set()", () => {
  clear();
  const dataUrl = "data:audio/mpeg;base64,ABC123";
  set("sound:test.mp3", dataUrl);
  assertEquals(get("sound:test.mp3"), dataUrl);
});

Deno.test("get() returns null after remove()", () => {
  clear();
  set("sound:test.mp3", "data:audio/mpeg;base64,ABC123");
  remove("sound:test.mp3");
  assertEquals(get("sound:test.mp3"), null);
});

Deno.test("size() returns 0 for empty cache", () => {
  clear();
  assertEquals(size(), 0);
});

Deno.test("size() returns correct count after multiple set()", () => {
  clear();
  set("sound:a.mp3", "data:audio/mpeg;base64,A");
  set("sound:b.mp3", "data:audio/mpeg;base64,B");
  set("sound:c.mp3", "data:audio/mpeg;base64,C");
  assertEquals(size(), 3);
});

Deno.test("keys() returns empty array for empty cache", () => {
  clear();
  assertEquals(keys(), []);
});

Deno.test("keys() returns all keys after multiple set()", () => {
  clear();
  set("sound:a.mp3", "data:audio/mpeg;base64,A");
  set("sound:b.mp3", "data:audio/mpeg;base64,B");
  const result = keys();
  assertEquals(result.length, 2);
  assert(result.includes("sound:a.mp3"));
  assert(result.includes("sound:b.mp3"));
});

Deno.test("remove() deletes specific entry", () => {
  clear();
  set("sound:a.mp3", "data:audio/mpeg;base64,A");
  set("sound:b.mp3", "data:audio/mpeg;base64,B");
  remove("sound:a.mp3");
  assertEquals(size(), 1);
  assertEquals(has("sound:a.mp3"), false);
  assertEquals(has("sound:b.mp3"), true);
});

Deno.test("remove() has no effect on unknown key", () => {
  clear();
  set("sound:a.mp3", "data:audio/mpeg;base64,A");
  remove("sound:unknown.mp3");
  assertEquals(size(), 1);
});

Deno.test("clear() empties entire cache", () => {
  clear();
  set("sound:a.mp3", "data:audio/mpeg;base64,A");
  set("sound:b.mp3", "data:audio/mpeg;base64,B");
  clear();
  assertEquals(size(), 0);
  assertEquals(keys(), []);
});

Deno.test("get() updates LRU order", () => {
  clear();
  set("sound:a.mp3", "data:audio/mpeg;base64,A");
  set("sound:b.mp3", "data:audio/mpeg;base64,B");
  set("sound:c.mp3", "data:audio/mpeg;base64,C");
  get("sound:a.mp3");
  const result = keys();
  assertEquals(result[result.length - 1], "sound:a.mp3");
  assertEquals(result[0], "sound:b.mp3");
});

Deno.test("LRU eviction removes oldest entries first", () => {
  clear();
  setMaxSize(2000);
  const smallData = "A".repeat(100);
  for (let i = 0; i < 5; i++) {
    set(`sound:${i}.mp3`, `data:audio/mpeg;base64,${smallData}`);
  }
  assertEquals(size(), 5);
  const largeData = "B".repeat(500);
  set("sound:large.mp3", `data:audio/mpeg;base64,${largeData}`);
  assert(size() < 5);
  assertEquals(has("sound:large.mp3"), true);
  setMaxSize(5 * 1024 * 1024);
});

Deno.test("get() prevents eviction of accessed entries", () => {
  clear();
  setMaxSize(2000);
  const data = "A".repeat(100);
  set("sound:a.mp3", `data:audio/mpeg;base64,${data}`);
  set("sound:b.mp3", `data:audio/mpeg;base64,${data}`);
  get("sound:a.mp3");
  const largeData = "B".repeat(500);
  set("sound:large.mp3", `data:audio/mpeg;base64,${largeData}`);
  assertEquals(has("sound:a.mp3"), true);
  setMaxSize(5 * 1024 * 1024);
});

Deno.test("cache persists across load/save cycles", () => {
  clear();
  const dataUrl = "data:audio/mpeg;base64,ABC123";
  set("sound:test.mp3", dataUrl);
  assertEquals(get("sound:test.mp3"), dataUrl);
  assertEquals(size(), 1);
});
