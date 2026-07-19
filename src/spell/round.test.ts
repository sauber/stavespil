import { assertEquals, assert, assertRejects, assertThrows } from "@std/assert";
import { createRound, selectWords } from "./round.ts";
import type { EngineState, MediaLoader } from "./types.ts";
import type { WordList } from "../words/generate.ts";

function makeGroups(): WordList[] {
  const groups: WordList[] = [];
  for (let i = 0; i < 100; i++) {
    const words: WordList = [];
    for (let j = 0; j < 20; j++) {
      words.push({ type: "noun", word: `ord${i}_${j}`, score: 0.5 });
    }
    groups.push(words);
  }
  return groups;
}

function mockImageLoader(): MediaLoader {
  return (_word: string): Promise<Uint8Array> => {
    return Promise.resolve(new Uint8Array([1, 2, 3]));
  };
}

function mockSoundLoader(): MediaLoader {
  return (_word: string): Promise<Uint8Array> => {
    return Promise.resolve(new Uint8Array([4, 5, 6]));
  };
}

function setupLocalStorage(): void {
  const groups = makeGroups();
  localStorage.setItem("wordList", JSON.stringify(groups));
}

function clearLocalStorage(): void {
  localStorage.removeItem("wordList");
}

Deno.test("selectWords picks 20 words total", () => {
  const groups = makeGroups();
  const words = selectWords(groups, 5);
  assertEquals(words.length, 20);
});

Deno.test("selectWords picks 10 from chosen level", () => {
  const groups = makeGroups();
  const words = selectWords(groups, 5);
  const levelWords = groups[4].map((e) => e.word);
  const fromLevel = words.filter((w) => levelWords.includes(w));
  assertEquals(fromLevel.length, 10);
});

Deno.test("selectWords picks 5 from level below", () => {
  const groups = makeGroups();
  const words = selectWords(groups, 5);
  const belowWords = groups[3].map((e) => e.word);
  const fromBelow = words.filter((w) => belowWords.includes(w));
  assertEquals(fromBelow.length, 5);
});

Deno.test("selectWords picks 5 from level above", () => {
  const groups = makeGroups();
  const words = selectWords(groups, 5);
  const aboveWords = groups[5].map((e) => e.word);
  const fromAbove = words.filter((w) => aboveWords.includes(w));
  assertEquals(fromAbove.length, 5);
});

Deno.test("selectWords clamps difficulty=1 so below equals level", () => {
  const groups = makeGroups();
  const words = selectWords(groups, 1);
  assertEquals(words.length, 20);
  const levelWords = groups[0].map((e) => e.word);
  const aboveWords = groups[1].map((e) => e.word);
  const fromLevelOrBelow = words.filter((w) => levelWords.includes(w));
  const fromAbove = words.filter((w) => aboveWords.includes(w));
  assertEquals(fromLevelOrBelow.length, 15);
  assertEquals(fromAbove.length, 5);
});

Deno.test("selectWords clamps difficulty=100 so above equals level", () => {
  const groups = makeGroups();
  const words = selectWords(groups, 100);
  assertEquals(words.length, 20);
  const levelWords = groups[99].map((e) => e.word);
  const belowWords = groups[98].map((e) => e.word);
  const fromLevelOrAbove = words.filter((w) => levelWords.includes(w));
  const fromBelow = words.filter((w) => belowWords.includes(w));
  assertEquals(fromLevelOrAbove.length, 15);
  assertEquals(fromBelow.length, 5);
});

Deno.test("createRound fetches media and creates round", async () => {
  setupLocalStorage();
  const states: EngineState[] = [];
  const round = await createRound({
    difficulty: 5,
    imageLoader: mockImageLoader(),
    soundLoader: mockSoundLoader(),
    onStateChange: (s) => states.push(s),
  });

  assertEquals(states.length, 1);
  assertEquals(states[0].totalWords, 20);
  assertEquals(states[0].wordIndex, 0);
  assert(round.isComplete() === false);

  clearLocalStorage();
});

Deno.test("createRound throws when word database is empty", async () => {
  clearLocalStorage();
  await assertRejects(
    () =>
      createRound({
        difficulty: 5,
        imageLoader: mockImageLoader(),
        soundLoader: mockSoundLoader(),
        onStateChange: () => {},
      }),
    Error,
    "Word database not initialized",
  );
});

Deno.test("round completes after 20 words", async () => {
  setupLocalStorage();
  const round = await createRound({
    difficulty: 1,
    imageLoader: mockImageLoader(),
    soundLoader: mockSoundLoader(),
    onStateChange: () => {},
  });

  const words = round.getWords();
  assertEquals(words.length, 20);

  for (let i = 0; i < 20; i++) {
    for (const ch of words[i]) {
      round.enterLetter(ch);
    }
    round.nextWord();
  }

  assert(round.isComplete());
  clearLocalStorage();
});

Deno.test("round.getResult returns valid RoundResult", async () => {
  setupLocalStorage();
  const round = await createRound({
    difficulty: 5,
    imageLoader: mockImageLoader(),
    soundLoader: mockSoundLoader(),
    onStateChange: () => {},
  });

  const words = round.getWords();
  for (let i = 0; i < 20; i++) {
    for (const ch of words[i]) {
      round.enterLetter(ch);
    }
    round.nextWord();
  }

  const result = round.getResult();
  assertEquals(typeof result.score, "number");
  assertEquals(typeof result.errors, "number");
  assertEquals(typeof result.timeScore, "number");
  assertEquals(typeof result.totalTime, "number");
  assertEquals(result.difficulty, 5);
  assertEquals(typeof result.isRankUp, "boolean");
  assertEquals(typeof result.maxStreak, "number");

  clearLocalStorage();
});

Deno.test("round.getResult throws before completion", async () => {
  setupLocalStorage();
  const round = await createRound({
    difficulty: 1,
    imageLoader: mockImageLoader(),
    soundLoader: mockSoundLoader(),
    onStateChange: () => {},
  });

  assertThrows(() => round.getResult(), Error, "Round not yet completed");
  clearLocalStorage();
});

Deno.test("round propagates state changes to callback", async () => {
  setupLocalStorage();
  const states: EngineState[] = [];
  const round = await createRound({
    difficulty: 1,
    imageLoader: mockImageLoader(),
    soundLoader: mockSoundLoader(),
    onStateChange: (s) => states.push(s),
  });

  round.enterLetter("o");
  assertEquals(states.length, 2);

  clearLocalStorage();
});
