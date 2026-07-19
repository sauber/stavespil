import { assertEquals } from "@std/assert";
import { onLetterInput, resetLevel, type CheerInput } from "./cheer.ts";

function makeInput(overrides: Partial<CheerInput> = {}): CheerInput {
  return {
    word: "kat",
    letterIndex: 0,
    isCorrect: true,
    errorCount: 0,
    isWordComplete: false,
    ...overrides,
  };
}

Deno.test("onLetterInput returns null for correct letter mid-word", () => {
  resetLevel();
  const result = onLetterInput(makeInput({ isCorrect: true, errorCount: 0 }));
  assertEquals(result, null);
});

Deno.test("onLetterInput returns neutral message on 1st error", () => {
  resetLevel();
  const result = onLetterInput(makeInput({ isCorrect: false, errorCount: 1 }));
  assertEquals(result?.text, "Ups! Prøv igen");
  assertEquals(result?.style, "neutral");
});

Deno.test("onLetterInput returns helpful message on 2nd error", () => {
  resetLevel();
  const result = onLetterInput(makeInput({ isCorrect: false, errorCount: 2 }));
  assertEquals(result?.text, "Tænk på lyden!");
  assertEquals(result?.style, "helpful");
});

Deno.test("onLetterInput returns encouraging message on 3rd error", () => {
  resetLevel();
  const result = onLetterInput(makeInput({ isCorrect: false, errorCount: 3 }));
  assertEquals(result?.text, "Du kan godt!");
  assertEquals(result?.style, "encouraging");
});

Deno.test("onLetterInput returns reference message on 4th+ error", () => {
  resetLevel();
  const result4 = onLetterInput(makeInput({ isCorrect: false, errorCount: 4 }));
  assertEquals(result4?.text, "Se bogstaverne der lyser!");
  assertEquals(result4?.style, "reference");

  const result5 = onLetterInput(makeInput({ isCorrect: false, errorCount: 5 }));
  assertEquals(result5?.text, "Se bogstaverne der lyser!");
  assertEquals(result5?.style, "reference");
});

Deno.test("onLetterInput returns perfect message on word complete with 0 errors", () => {
  resetLevel();
  const result = onLetterInput(
    makeInput({ isWordComplete: true, errorCount: 0 }),
  );
  assertEquals(result?.text, "Perfekt!");
  assertEquals(result?.emoji, "⭐");
  assertEquals(result?.style, "celebrated");
});

Deno.test("onLetterInput returns good message on word complete with 1-2 errors", () => {
  resetLevel();
  const result1 = onLetterInput(
    makeInput({ isWordComplete: true, errorCount: 1 }),
  );
  assertEquals(result1?.text, "Godt klaret!");
  assertEquals(result1?.style, "encouraging");

  const result2 = onLetterInput(
    makeInput({ isWordComplete: true, errorCount: 2 }),
  );
  assertEquals(result2?.text, "Godt klaret!");
  assertEquals(result2?.style, "encouraging");
});

Deno.test("onLetterInput returns null on word complete with 3+ errors", () => {
  resetLevel();
  const result = onLetterInput(
    makeInput({ isWordComplete: true, errorCount: 3 }),
  );
  assertEquals(result, null);
});

Deno.test("streak resets on wrong letter", () => {
  resetLevel();
  onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 }));
  onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 }));
  onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 }));
  onLetterInput(makeInput({ isCorrect: false, errorCount: 1 }));
  onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 }));
  onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 }));
  onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 }));
  onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 }));
  onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 }));
  const result = onLetterInput(
    makeInput({ isWordComplete: true, errorCount: 0 }),
  );
  assertEquals(result?.text, "Fantastisk streak!");
  assertEquals(result?.style, "milestone");
});

Deno.test("streak milestone triggers at exactly 5 correct words", () => {
  resetLevel();
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(
      onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 })),
    );
  }
  assertEquals(results[0]?.text, "Perfekt!");
  assertEquals(results[1]?.text, "Perfekt!");
  assertEquals(results[2]?.text, "Perfekt!");
  assertEquals(results[3]?.text, "Perfekt!");
  assertEquals(results[4]?.text, "Fantastisk streak!");
  assertEquals(results[4]?.style, "milestone");
});

Deno.test("resetLevel resets streak count", () => {
  resetLevel();
  for (let i = 0; i < 5; i++) {
    onLetterInput(makeInput({ isWordComplete: true, errorCount: 0 }));
  }
  resetLevel();
  const result = onLetterInput(
    makeInput({ isWordComplete: true, errorCount: 0 }),
  );
  assertEquals(result?.text, "Perfekt!");
});
