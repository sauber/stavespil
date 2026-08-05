import { assertEquals, assert } from "@std/assert";
import { createEngine } from "./engine.ts";
import type { EngineState, Media } from "./types.ts";

function makeMedia(): Media {
  return {
    image: new Uint8Array([1, 2, 3]),
    sound: new Uint8Array([4, 5, 6]),
  };
}

function makeStateCapture() {
  const states: EngineState[] = [];
  return {
    capture: (state: EngineState) => {
      states.push(state);
    },
    get: () => states,
    last: () => states[states.length - 1],
    count: () => states.length,
  };
}

Deno.test("engine initializes with first word state", () => {
  const capture = makeStateCapture();
  createEngine(["kat"], [makeMedia()], capture.capture);
  const state = capture.last();
  assertEquals(state.wordIndex, 0);
  assertEquals(state.totalWords, 1);
  assertEquals(state.frames, [null, null, null]);
  assertEquals(state.isWordComplete, false);
  assertEquals(state.isComplete, false);
  assertEquals(state.wordErrors, 0);
  assertEquals(state.totalErrors, 0);
});

Deno.test("engine fills frame on correct letter", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("k");
  const state = capture.last();
  assertEquals(state.frames, ["k", null, null]);
  assertEquals(state.wordErrors, 0);
});

Deno.test("engine increments errors on wrong letter", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("x");
  const state = capture.last();
  assertEquals(state.frames, [null, null, null]);
  assertEquals(state.wordErrors, 1);
  assertEquals(state.totalErrors, 1);
});

Deno.test("engine reports proper cheer on first wrong letter", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("x");
  const state = capture.last();
  assertEquals(state.cheer?.text, "Ups! Prøv igen");
  assertEquals(state.cheer?.emoji, "😊");
});

Deno.test("engine escalates cheer messages on repeated wrong letters", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("x");
  engine.enterLetter("y");
  engine.enterLetter("z");
  engine.enterLetter("q");
  const texts = capture.get().slice(1).map((s) => s.cheer?.text);
  assertEquals(texts, [
    "Ups! Prøv igen",
    "Tænk på lyden!",
    "Du kan godt!",
    "Se bogstaverne der lyser!",
  ]);
});

Deno.test("engine is case-insensitive", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("K");
  const state = capture.last();
  assertEquals(state.frames, ["K", null, null]);
  assertEquals(state.wordErrors, 0);
});

Deno.test("engine completes word when all frames filled", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  const state = capture.last();
  assertEquals(state.isWordComplete, true);
  assertEquals(state.frames, ["k", "a", "t"]);
});

Deno.test("engine records word result on completion", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  const results = engine.getWordResults();
  assertEquals(results.length, 1);
  assertEquals(results[0].word, "kat");
  assertEquals(results[0].errors, 0);
  assert(results[0].startTime > 0, "startTime should be set");
  assert(results[0].endTime > 0, "endTime should be set");
});

Deno.test("engine tracks errors across word completion", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("x");
  engine.enterLetter("y");
  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  const state = capture.last();
  assertEquals(state.wordErrors, 2);
  assertEquals(state.totalErrors, 2);
  const results = engine.getWordResults();
  assertEquals(results[0].errors, 2);
});

Deno.test("engine advances to next word via nextWord()", () => {
  const capture = makeStateCapture();
  const media = [makeMedia(), makeMedia()];
  const engine = createEngine(["kat", "hund"], media, capture.capture);

  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  engine.nextWord();

  const state = capture.last();
  assertEquals(state.wordIndex, 1);
  assertEquals(state.frames, [null, null, null, null]);
  assertEquals(state.isWordComplete, false);
  assertEquals(state.wordErrors, 0);
});

Deno.test("engine marks round complete after last word", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  engine.nextWord();
  const state = capture.last();
  assertEquals(state.isComplete, true);
});

Deno.test("engine ignores input after round complete", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  engine.nextWord();
  const countBefore = capture.count();
  engine.enterLetter("x");
  assertEquals(capture.count(), countBefore);
});

Deno.test("engine ignores nextWord after round complete", () => {
  const capture = makeStateCapture();
  const engine = createEngine(["kat"], [makeMedia()], capture.capture);
  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  engine.nextWord();
  const countBefore = capture.count();
  engine.nextWord();
  assertEquals(capture.count(), countBefore);
});

Deno.test("engine ignores nextWord when word not complete", () => {
  const capture = makeStateCapture();
  const media = [makeMedia(), makeMedia()];
  const engine = createEngine(["kat", "hund"], media, capture.capture);
  engine.enterLetter("k");
  const countBefore = capture.count();
  engine.nextWord();
  assertEquals(capture.count(), countBefore);
});

Deno.test("engine ignores input after word complete but before nextWord", () => {
  const capture = makeStateCapture();
  const media = [makeMedia(), makeMedia()];
  const engine = createEngine(["kat", "hund"], media, capture.capture);
  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  const countBefore = capture.count();
  engine.enterLetter("x");
  assertEquals(capture.count(), countBefore);
});

Deno.test("engine provides correct wordLetters for keyboard", () => {
  const capture = makeStateCapture();
  createEngine(["kat"], [makeMedia()], capture.capture);
  const state = capture.last();
  assertEquals(state.wordLetters.sort(), ["a", "k", "t"]);
});

Deno.test("engine deduplicates letters in wordLetters", () => {
  const capture = makeStateCapture();
  createEngine(["kommer"], [makeMedia()], capture.capture);
  const state = capture.last();
  const letters = state.wordLetters;
  assertEquals(letters.length, new Set(letters).size);
});

Deno.test("engine provides media data in state", () => {
  const media: Media = {
    image: new Uint8Array([10, 20]),
    sound: new Uint8Array([30, 40]),
  };
  const capture = makeStateCapture();
  createEngine(["kat"], [media], capture.capture);
  const state = capture.last();
  assertEquals(state.image, media.image);
  assertEquals(state.sound, media.sound);
});

Deno.test("engine accumulates totalErrors across multiple words", () => {
  const capture = makeStateCapture();
  const media = [makeMedia(), makeMedia()];
  const engine = createEngine(["kat", "hund"], media, capture.capture);

  engine.enterLetter("x");
  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  engine.nextWord();

  engine.enterLetter("y");
  engine.enterLetter("h");
  engine.enterLetter("u");
  engine.enterLetter("n");
  engine.enterLetter("d");

  const state = capture.last();
  assertEquals(state.totalErrors, 2);
});

Deno.test("engine full round with two words", () => {
  const capture = makeStateCapture();
  const media = [makeMedia(), makeMedia()];
  const engine = createEngine(["kat", "hund"], media, capture.capture);

  engine.enterLetter("k");
  engine.enterLetter("a");
  engine.enterLetter("t");
  engine.nextWord();

  engine.enterLetter("h");
  engine.enterLetter("u");
  engine.enterLetter("n");
  engine.enterLetter("d");
  engine.nextWord();

  const state = capture.last();
  assertEquals(state.isComplete, true);

  const results = engine.getWordResults();
  assertEquals(results.length, 2);
  assertEquals(results[0].word, "kat");
  assertEquals(results[1].word, "hund");
});
