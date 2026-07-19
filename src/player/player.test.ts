import { assertEquals, assertArrayIncludes } from "@std/assert";
import {
  calculateNewRank,
  loadProfile,
  saveProfile,
  clearProfile,
  getEarnedTrophyIds,
  buildPlayerStats,
} from "./player.ts";
import type { PlayerProfile, RoundHistoryEntry } from "./player.ts";

function makeEntry(overrides: Partial<RoundHistoryEntry> = {}): RoundHistoryEntry {
  return {
    difficulty: 5,
    result: 0,
    newRank: 5,
    errors: 2,
    totalTime: 120,
    trophiesUnlocked: [],
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeProfile(
  entries: RoundHistoryEntry[] = [],
): PlayerProfile {
  return { roundHistory: entries };
}

function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
    clear: () => { map.clear(); },
    get length() { return map.size; },
    key: (index: number) => [...map.keys()][index] ?? null,
  };
}

// ---------------------------------------------------------------------------
// calculateNewRank
// ---------------------------------------------------------------------------

Deno.test("calculateNewRank ranks up when difficulty == rank and result == +1", () => {
  assertEquals(calculateNewRank(5, 5, 1), 6);
});

Deno.test("calculateNewRank ranks down when difficulty == rank and result == -1", () => {
  assertEquals(calculateNewRank(5, 5, -1), 4);
});

Deno.test("calculateNewRank stays same when difficulty == rank and result == 0", () => {
  assertEquals(calculateNewRank(5, 5, 0), 5);
});

Deno.test("calculateNewRank ranks up when difficulty > rank and result == +1", () => {
  assertEquals(calculateNewRank(5, 8, 1), 6);
});

Deno.test("calculateNewRank ranks up when difficulty > rank and result == 0", () => {
  assertEquals(calculateNewRank(5, 8, 0), 6);
});

Deno.test("calculateNewRank stays same when difficulty > rank and result == -1", () => {
  assertEquals(calculateNewRank(5, 8, -1), 5);
});

Deno.test("calculateNewRank ranks down when difficulty < rank and result == -1", () => {
  assertEquals(calculateNewRank(5, 3, -1), 4);
});

Deno.test("calculateNewRank ranks down when difficulty < rank and result == 0", () => {
  assertEquals(calculateNewRank(5, 3, 0), 4);
});

Deno.test("calculateNewRank stays same when difficulty < rank and result == +1", () => {
  assertEquals(calculateNewRank(5, 3, 1), 5);
});

Deno.test("calculateNewRank clamps to 1 at bottom", () => {
  assertEquals(calculateNewRank(1, 1, -1), 1);
});

Deno.test("calculateNewRank clamps to 100 at top", () => {
  assertEquals(calculateNewRank(100, 100, 1), 100);
});

Deno.test("calculateNewRank clamps rank-down to 1 when difficulty < rank", () => {
  assertEquals(calculateNewRank(1, 1, -1), 1);
});

Deno.test("calculateNewRank clamps rank-up to 100 when difficulty > rank", () => {
  assertEquals(calculateNewRank(100, 100, 1), 100);
});

// ---------------------------------------------------------------------------
// loadProfile / saveProfile / clearProfile
// ---------------------------------------------------------------------------

Deno.test("loadProfile returns empty profile when nothing stored", () => {
  const profile = loadProfile(makeStorage());
  assertEquals(profile.roundHistory.length, 0);
});

Deno.test("saveProfile persists and loadProfile retrieves it", () => {
  const storage = makeStorage();
  const entry = makeEntry();
  const profile = makeProfile([entry]);

  saveProfile(profile, storage);
  const loaded = loadProfile(storage);

  assertEquals(loaded.roundHistory.length, 1);
  assertEquals(loaded.roundHistory[0].difficulty, 5);
  assertEquals(loaded.roundHistory[0].newRank, 5);
});

Deno.test("clearProfile removes stored data", () => {
  const storage = makeStorage();
  saveProfile(makeProfile([makeEntry()]), storage);
  clearProfile(storage);
  const loaded = loadProfile(storage);
  assertEquals(loaded.roundHistory.length, 0);
});

Deno.test("loadProfile returns empty profile on malformed JSON", () => {
  const storage = makeStorage();
  storage.setItem("roundHistory", "NOT JSON");
  const profile = loadProfile(storage);
  assertEquals(profile.roundHistory.length, 0);
});

Deno.test("loadProfile returns empty profile when storage throws", () => {
  const broken: Storage = {
    getItem: () => { throw new Error("fail"); },
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    get length() { return 0; },
    key: () => null,
  };
  const profile = loadProfile(broken);
  assertEquals(profile.roundHistory.length, 0);
});

// ---------------------------------------------------------------------------
// getEarnedTrophyIds
// ---------------------------------------------------------------------------

Deno.test("getEarnedTrophyIds returns empty array for empty history", () => {
  assertEquals(getEarnedTrophyIds(makeProfile()), []);
});

Deno.test("getEarnedTrophyIds collects unique trophy IDs", () => {
  const profile = makeProfile([
    makeEntry({ trophiesUnlocked: ["a", "b"] }),
    makeEntry({ trophiesUnlocked: ["b", "c"] }),
  ]);
  const ids = getEarnedTrophyIds(profile);
  assertEquals(ids.length, 3);
  assertArrayIncludes(ids, ["a", "b", "c"]);
});

Deno.test("getEarnedTrophyIds deduplicates across entries", () => {
  const profile = makeProfile([
    makeEntry({ trophiesUnlocked: ["x"] }),
    makeEntry({ trophiesUnlocked: ["x"] }),
    makeEntry({ trophiesUnlocked: ["x"] }),
  ]);
  assertEquals(getEarnedTrophyIds(profile), ["x"]);
});

// ---------------------------------------------------------------------------
// buildPlayerStats
// ---------------------------------------------------------------------------

Deno.test("buildPlayerStats returns defaults for empty profile", () => {
  const stats = buildPlayerStats(makeProfile());
  assertEquals(stats.totalRounds, 0);
  assertEquals(stats.distinctDifficulties.length, 0);
  assertEquals(stats.currentRank, 1);
});

Deno.test("buildPlayerStats computes correct totalRounds", () => {
  const profile = makeProfile([
    makeEntry(),
    makeEntry(),
    makeEntry(),
  ]);
  const stats = buildPlayerStats(profile);
  assertEquals(stats.totalRounds, 3);
});

Deno.test("buildPlayerStats computes currentRank from last entry", () => {
  const profile = makeProfile([
    makeEntry({ newRank: 3 }),
    makeEntry({ newRank: 7 }),
    makeEntry({ newRank: 5 }),
  ]);
  const stats = buildPlayerStats(profile);
  assertEquals(stats.currentRank, 5);
});

Deno.test("buildPlayerStats computes distinctDifficulties", () => {
  const profile = makeProfile([
    makeEntry({ difficulty: 2 }),
    makeEntry({ difficulty: 5 }),
    makeEntry({ difficulty: 2 }),
    makeEntry({ difficulty: 8 }),
  ]);
  const stats = buildPlayerStats(profile);
  assertEquals(stats.distinctDifficulties.length, 3);
  assertArrayIncludes(stats.distinctDifficulties, [2, 5, 8]);
});
