import { assertEquals } from "@std/assert";
import {
  checkTrophies,
  getEarnedTrophies,
  clearTrophies,
  type LevelResult,
  type PlayerStats,
} from "./trophy.ts";

function makeResult(overrides: Partial<LevelResult> = {}): LevelResult {
  return {
    score: 70,
    errors: 3,
    timeScore: 65,
    totalTime: 200,
    levelNumber: 5,
    isLevelUp: false,
    maxStreak: 0,
    ...overrides,
  };
}

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    totalGames: 1,
    levelsSeen: [5],
    currentLevel: 5,
    ...overrides,
  };
}

Deno.test("checkTrophies returns forste_bane on first level completion", () => {
  clearTrophies();
  const result = checkTrophies(makeResult(), makeStats());
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "forste_bane");
  assertEquals(result[0].emoji, "🌟");
});

Deno.test("checkTrophies does not return forste_bane twice", () => {
  clearTrophies();
  checkTrophies(makeResult(), makeStats());
  const second = checkTrophies(makeResult(), makeStats());
  assertEquals(second.length, 0);
});

Deno.test("checkTrophies returns stavemester for score >= 90", () => {
  clearTrophies();
  const result = checkTrophies(makeResult({ score: 90 }), makeStats());
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("stavemester"), true);
});

Deno.test("checkTrophies returns lynhurtig for timeScore >= 90", () => {
  clearTrophies();
  const result = checkTrophies(makeResult({ timeScore: 90 }), makeStats());
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("lynhurtig"), true);
});

Deno.test("checkTrophies returns fejlfri for 0 errors", () => {
  clearTrophies();
  const result = checkTrophies(makeResult({ errors: 0 }), makeStats());
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("fejlfri"), true);
});

Deno.test("checkTrophies returns flittig for totalGames >= 5", () => {
  clearTrophies();
  const result = checkTrophies(makeResult(), makeStats({ totalGames: 5 }));
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("flittig"), true);
});

Deno.test("checkTrophies returns pa_vej_op when isLevelUp is true", () => {
  clearTrophies();
  const result = checkTrophies(makeResult({ isLevelUp: true }), makeStats());
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("pa_vej_op"), true);
});

Deno.test("checkTrophies returnsbjergbestiger for level >= 10", () => {
  clearTrophies();
  const result = checkTrophies(makeResult(), makeStats({ currentLevel: 10 }));
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("bjergbestiger"), true);
});

Deno.test("checkTrophies returns ekspres for totalTime < 180", () => {
  clearTrophies();
  const result = checkTrophies(makeResult({ totalTime: 120 }), makeStats());
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("ekspres"), true);
});

Deno.test("checkTrophies returns regnbue for 5+ distinct levels seen", () => {
  clearTrophies();
  const result = checkTrophies(
    makeResult(),
    makeStats({ levelsSeen: [1, 2, 3, 4, 5] }),
  );
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("regnbue"), true);
});

Deno.test("checkTrophies returns natteravn for level >= 25", () => {
  clearTrophies();
  const result = checkTrophies(makeResult(), makeStats({ currentLevel: 25 }));
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("natteravn"), true);
});

Deno.test("checkTrophies returns kongen_af_ord for level >= 50", () => {
  clearTrophies();
  const result = checkTrophies(makeResult(), makeStats({ currentLevel: 50 }));
  const ids = result.map((t) => t.id);
  assertEquals(ids.includes("kongen_af_ord"), true);
});

Deno.test("getEarnedTrophies returns saved trophies", () => {
  clearTrophies();
  checkTrophies(makeResult(), makeStats());
  const earned = getEarnedTrophies();
  assertEquals(earned.length, 1);
  assertEquals(earned[0].id, "forste_bane");
  assertEquals(typeof earned[0].unlockedAt, "number");
});

Deno.test("clearTrophies removes all earned trophies", () => {
  clearTrophies();
  checkTrophies(makeResult(), makeStats());
  clearTrophies();
  const earned = getEarnedTrophies();
  assertEquals(earned.length, 0);
});
