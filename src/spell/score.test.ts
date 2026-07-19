import { assertEquals } from "@std/assert";
import {
  calculateErrorScore,
  calculateTimeScore,
  calculateCombinedScore,
  calculateRankChange,
  calculateTotalTime,
  calculateMaxStreak,
  computeScore,
} from "./score.ts";
import type { WordResult } from "./types.ts";

function makeWordResult(overrides: Partial<WordResult> = {}): WordResult {
  return {
    word: "kat",
    errors: 0,
    startTime: 1000,
    endTime: 4000,
    ...overrides,
  };
}

Deno.test("calculateErrorScore returns 100 for 0 errors", () => {
  assertEquals(calculateErrorScore(0), 100);
});

Deno.test("calculateErrorScore returns 80 for 1 error", () => {
  assertEquals(calculateErrorScore(1), 80);
});

Deno.test("calculateErrorScore returns 60 for 2 errors", () => {
  assertEquals(calculateErrorScore(2), 60);
});

Deno.test("calculateErrorScore returns 40 for 3 errors", () => {
  assertEquals(calculateErrorScore(3), 40);
});

Deno.test("calculateErrorScore returns 20 for 4+ errors", () => {
  assertEquals(calculateErrorScore(4), 20);
  assertEquals(calculateErrorScore(10), 20);
});

Deno.test("calculateErrorScore interpolates between breakpoints", () => {
  assertEquals(calculateErrorScore(0.5), 90);
  assertEquals(calculateErrorScore(1.5), 70);
  assertEquals(calculateErrorScore(2.5), 50);
  assertEquals(calculateErrorScore(3.5), 30);
});

Deno.test("calculateErrorScore clamps negative to 100", () => {
  assertEquals(calculateErrorScore(-1), 100);
});

Deno.test("calculateTimeScore returns 0 for empty results", () => {
  assertEquals(calculateTimeScore([], 5), 0);
});

Deno.test("calculateTimeScore rewards fast completion", () => {
  const results = [
    makeWordResult({ word: "kat", startTime: 0, endTime: 3000 }),
  ];
  const score = calculateTimeScore(results, 1);
  assertEquals(score > 0, true);
});

Deno.test("calculateTimeScore penalizes slow completion", () => {
  const fast = [makeWordResult({ word: "kat", startTime: 0, endTime: 2000 })];
  const slow = [makeWordResult({ word: "kat", startTime: 0, endTime: 10000 })];
  const fastScore = calculateTimeScore(fast, 1);
  const slowScore = calculateTimeScore(slow, 1);
  assertEquals(fastScore > slowScore, true);
});

Deno.test("calculateTimeScore caps at 100", () => {
  const results = [
    makeWordResult({ word: "kat", startTime: 0, endTime: 100 }),
  ];
  const score = calculateTimeScore(results, 1);
  assertEquals(score <= 100, true);
});

Deno.test("calculateTimeScore uses difficulty multiplier", () => {
  const results = [
    makeWordResult({ word: "kat", startTime: 0, endTime: 10000 }),
  ];
  const easyScore = calculateTimeScore(results, 1);
  const hardScore = calculateTimeScore(results, 100);
  assertEquals(hardScore > easyScore, true);
});

Deno.test("calculateCombinedScore weights error 60% and time 40%", () => {
  assertEquals(calculateCombinedScore(100, 100), 100);
  assertEquals(calculateCombinedScore(0, 0), 0);
  assertEquals(calculateCombinedScore(100, 0), 60);
  assertEquals(calculateCombinedScore(0, 100), 40);
});

Deno.test("calculateRankChange returns +1 for score >= 75", () => {
  assertEquals(calculateRankChange(75), 1);
  assertEquals(calculateRankChange(100), 1);
});

Deno.test("calculateRankChange returns 0 for score 40–74", () => {
  assertEquals(calculateRankChange(40), 0);
  assertEquals(calculateRankChange(57), 0);
  assertEquals(calculateRankChange(74), 0);
});

Deno.test("calculateRankChange returns -1 for score < 40", () => {
  assertEquals(calculateRankChange(0), -1);
  assertEquals(calculateRankChange(39), -1);
});

Deno.test("calculateTotalTime sums word durations", () => {
  const results = [
    makeWordResult({ startTime: 0, endTime: 3000 }),
    makeWordResult({ startTime: 0, endTime: 5000 }),
  ];
  assertEquals(calculateTotalTime(results), 8);
});

Deno.test("calculateTotalTime returns 0 for empty results", () => {
  assertEquals(calculateTotalTime([]), 0);
});

Deno.test("calculateMaxStreak returns 0 for no error-free words", () => {
  const results = [
    makeWordResult({ errors: 1 }),
    makeWordResult({ errors: 2 }),
  ];
  assertEquals(calculateMaxStreak(results), 0);
});

Deno.test("calculateMaxStreak counts consecutive error-free words", () => {
  const results = [
    makeWordResult({ errors: 0 }),
    makeWordResult({ errors: 0 }),
    makeWordResult({ errors: 1 }),
    makeWordResult({ errors: 0 }),
    makeWordResult({ errors: 0 }),
    makeWordResult({ errors: 0 }),
  ];
  assertEquals(calculateMaxStreak(results), 3);
});

Deno.test("calculateMaxStreak returns total for all error-free", () => {
  const results = [
    makeWordResult({ errors: 0 }),
    makeWordResult({ errors: 0 }),
    makeWordResult({ errors: 0 }),
  ];
  assertEquals(calculateMaxStreak(results), 3);
});

Deno.test("computeScore returns complete ScoreResult", () => {
  const results = Array.from({ length: 20 }, () =>
    makeWordResult({ word: "test", errors: 0, startTime: 0, endTime: 4000 })
  );
  const result = computeScore(results, 5);
  assertEquals(typeof result.errorScore, "number");
  assertEquals(typeof result.timeScore, "number");
  assertEquals(typeof result.combinedScore, "number");
  assertEquals(typeof result.rankChange, "number");
  assertEquals(typeof result.totalTime, "number");
});
