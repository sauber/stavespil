import type { PlayerStats } from "../gameState/mod.ts";

/** A single round entry in the player's history. */
export type RoundHistoryEntry = {
  /** Difficulty level played (1–100) */
  difficulty: number;
  /** Rank change result: -1, 0, or +1 */
  result: number;
  /** Player's rank after this round */
  newRank: number;
  /** Total letter errors across all words in the round */
  errors: number;
  /** Total round completion time in seconds */
  totalTime: number;
  /** IDs of trophies unlocked during this round */
  trophiesUnlocked: string[];
  /** Unix timestamp (ms) when the round was completed */
  timestamp: number;
};

/** The full player profile stored in localStorage. */
export type PlayerProfile = {
  roundHistory: RoundHistoryEntry[];
};

const STORAGE_KEY = "roundHistory";

/**
 * Calculate the player's new rank after a completed round.
 *
 * Rules (S = current rank, B = difficulty, R = result):
 *   T = S - 1  when S == B and R == -1
 *   T = S - 1  when B < S  and R <= 0
 *   T = S + 1  when S == B and R == +1
 *   T = S + 1  when B > S  and R >= 0
 *   T = S      in all other cases
 *
 * @param currentRank - The player's current rank (1–100)
 * @param difficulty  - The difficulty level that was played (1–100)
 * @param result      - Rank change from the round: -1, 0, or +1
 * @returns The new rank, clamped to 1–100
 */
export function calculateNewRank(
  currentRank: number,
  difficulty: number,
  result: -1 | 0 | 1,
): number {
  let newRank: number;

  if (currentRank === difficulty && result === -1) {
    newRank = currentRank - 1;
  } else if (difficulty < currentRank && result <= 0) {
    newRank = currentRank - 1;
  } else if (currentRank === difficulty && result === 1) {
    newRank = currentRank + 1;
  } else if (difficulty > currentRank && result >= 0) {
    newRank = currentRank + 1;
  } else {
    newRank = currentRank;
  }

  return Math.max(1, Math.min(100, newRank));
}

/** Parse the stored profile from localStorage, or return an empty profile. */
function parseProfile(raw: string | null): PlayerProfile {
  if (raw === null) {
    return { roundHistory: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed && typeof parsed === "object" && Array.isArray(parsed.roundHistory)
    ) {
      return { roundHistory: parsed.roundHistory };
    }
  } catch {
    // malformed JSON — fall through
  }
  return { roundHistory: [] };
}

/**
 * Load the player profile from localStorage.
 *
 * @param storage - Storage backend (defaults to localStorage). Pass null to
 *                  get an empty profile without touching storage.
 * @returns The player profile, or an empty profile if nothing is stored.
 */
export function loadProfile(storage?: Storage | null): PlayerProfile {
  const s = storage ?? globalThis.localStorage;
  try {
    return parseProfile(s.getItem(STORAGE_KEY));
  } catch {
    return { roundHistory: [] };
  }
}

/**
 * Save the player profile to localStorage.
 *
 * @param profile - The profile to persist.
 * @param storage - Storage backend (defaults to localStorage). Pass null to
 *                  skip writing.
 */
export function saveProfile(
  profile: PlayerProfile,
  storage?: Storage | null,
): void {
  const s = storage ?? globalThis.localStorage;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

/**
 * Remove the player profile from localStorage.
 *
 * @param storage - Storage backend (defaults to localStorage). Pass null to
 *                  no-op.
 */
export function clearProfile(storage?: Storage | null): void {
  const s = storage ?? globalThis.localStorage;
  try {
    s.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Extract the unique set of earned trophy IDs from a player profile.
 *
 * @param profile - The player profile containing round history.
 * @returns Deduplicated array of trophy IDs.
 */
export function getEarnedTrophyIds(profile: PlayerProfile): string[] {
  const ids = new Set<string>();
  for (const entry of profile.roundHistory) {
    for (const id of entry.trophiesUnlocked) {
      ids.add(id);
    }
  }
  return [...ids];
}

/**
 * Compute cumulative player statistics from round history.
 *
 * @param profile - The player profile containing round history.
 * @returns PlayerStats for use with trophy checking.
 */
export function buildPlayerStats(profile: PlayerProfile): PlayerStats {
  const history = profile.roundHistory;
  if (history.length === 0) {
    return { totalRounds: 0, distinctDifficulties: [], currentRank: 1 };
  }

  const difficulties = new Set<number>();
  for (const entry of history) {
    difficulties.add(entry.difficulty);
  }

  const currentRank = history[history.length - 1].newRank;

  return {
    totalRounds: history.length,
    distinctDifficulties: [...difficulties],
    currentRank,
  };
}
