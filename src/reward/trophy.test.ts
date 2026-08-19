import { assertEquals } from "@std/assert";
import { checkTrophies } from "./trophy.ts";
import type { PlayerStats, RoundResult } from "../gameState/mod.ts";

function makeResult(overrides: Partial<RoundResult> = {}): RoundResult {
  return {
    score: 70,
    errors: 3,
    timeScore: 65,
    totalTime: 200,
    difficulty: 5,
    isRankUp: false,
    rankChange: 0,
    maxStreak: 0,
    ...overrides,
  };
}

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    totalRounds: 1,
    distinctDifficulties: [5],
    currentRank: 5,
    ...overrides,
  };
}

Deno.test("checkTrophies returns forste_bane on first round completion", () => {
  const result = checkTrophies(makeResult(), makeStats(), []);
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "forste_bane");
  assertEquals(result[0].emoji, "🌟");
});

Deno.test("checkTrophies does not return forste_bane twice", () => {
  const first = checkTrophies(makeResult(), makeStats(), []);
  const earnedIds = first.map((t) => t.id);
  const second = checkTrophies(makeResult(), makeStats(), earnedIds);
  assertEquals(second.length, 0);
});

Deno.test("checkTrophies returns stavemester for score >= 90", () => {
  const result = checkTrophies(makeResult({ score: 90 }), makeStats(), ["forste_bane"]);
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "stavemester");
});

Deno.test("checkTrophies returns lynhurtig for timeScore >= 90", () => {
  const result = checkTrophies(makeResult({ timeScore: 90 }), makeStats(), ["forste_bane"]);
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "lynhurtig");
});

Deno.test("checkTrophies returns fejlfri for 0 errors", () => {
  const result = checkTrophies(makeResult({ errors: 0 }), makeStats(), ["forste_bane"]);
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "fejlfri");
});

Deno.test("checkTrophies returns flittig for totalRounds >= 5", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ totalRounds: 5 }),
    ["forste_bane"],
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "flittig");
});

Deno.test("checkTrophies returns pa_vej_op when isRankUp is true", () => {
  const result = checkTrophies(
    makeResult({ isRankUp: true }),
    makeStats(),
    ["forste_bane"],
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "pa_vej_op");
});

Deno.test("checkTrophies returns bbjergbestiger for rank >= 10", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ currentRank: 10 }),
    ["forste_bane"],
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "bjergbestiger");
});

Deno.test("checkTrophies returns ekspres for totalTime < 180", () => {
  const result = checkTrophies(
    makeResult({ totalTime: 120 }),
    makeStats(),
    ["forste_bane"],
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "ekspres");
});

Deno.test("checkTrophies returns regnbue for 5+ distinct difficulties", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ distinctDifficulties: [1, 2, 3, 4, 5] }),
    ["forste_bane"],
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "regnbue");
});

Deno.test("checkTrophies returns natteravn for rank >= 25", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ currentRank: 25 }),
    ["forste_bane", "bjergbestiger"],
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "natteravn");
});

Deno.test("checkTrophies returns kongen_af_ord for rank >= 50", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ currentRank: 50 }),
    ["forste_bane", "bjergbestiger", "natteravn"],
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "kongen_af_ord");
});

Deno.test("checkTrophies returns at most 1 trophy per round", () => {
  const result = checkTrophies(
    makeResult({ score: 95, timeScore: 95, errors: 0, maxStreak: 12, totalTime: 100 }),
    makeStats({ totalRounds: 5 }),
    [],
  );
  assertEquals(result.length, 1);
});
