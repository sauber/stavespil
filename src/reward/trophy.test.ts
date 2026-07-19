import { assertEquals } from "@std/assert";
import {
  checkTrophies,
  type RoundResult,
  type PlayerStats,
} from "./trophy.ts";

function makeResult(overrides: Partial<RoundResult> = {}): RoundResult {
  return {
    score: 70,
    errors: 3,
    timeScore: 65,
    totalTime: 200,
    difficulty: 5,
    isRankUp: false,
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
  const result = checkTrophies(makeResult({ score: 90 }), makeStats(), []);
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("stavemester"), true);
});

Deno.test("checkTrophies returns lynhurtig for timeScore >= 90", () => {
  const result = checkTrophies(makeResult({ timeScore: 90 }), makeStats(), []);
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("lynhurtig"), true);
});

Deno.test("checkTrophies returns fejlfri for 0 errors", () => {
  const result = checkTrophies(makeResult({ errors: 0 }), makeStats(), []);
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("fejlfri"), true);
});

Deno.test("checkTrophies returns flittig for totalRounds >= 5", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ totalRounds: 5 }),
    [],
  );
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("flittig"), true);
});

Deno.test("checkTrophies returns pa_vej_op when isRankUp is true", () => {
  const result = checkTrophies(
    makeResult({ isRankUp: true }),
    makeStats(),
    [],
  );
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("pa_vej_op"), true);
});

Deno.test("checkTrophies returns bbjergbestiger for rank >= 10", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ currentRank: 10 }),
    [],
  );
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("bjergbestiger"), true);
});

Deno.test("checkTrophies returns ekspres for totalTime < 180", () => {
  const result = checkTrophies(
    makeResult({ totalTime: 120 }),
    makeStats(),
    [],
  );
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("ekspres"), true);
});

Deno.test("checkTrophies returns regnbue for 5+ distinct difficulties", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ distinctDifficulties: [1, 2, 3, 4, 5] }),
    [],
  );
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("regnbue"), true);
});

Deno.test("checkTrophies returns natteravn for rank >= 25", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ currentRank: 25 }),
    [],
  );
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("natteravn"), true);
});

Deno.test("checkTrophies returns kongen_af_ord for rank >= 50", () => {
  const result = checkTrophies(
    makeResult(),
    makeStats({ currentRank: 50 }),
    [],
  );
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("kongen_af_ord"), true);
});
