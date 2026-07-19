import type { PlayerStats, RoundResult } from "../gameState/mod.ts";

/** A trophy that can be earned by the player. */
export type Trophy = {
  /** Unique identifier */
  id: string;
  /** Danish title */
  title: string;
  /** Emoji icon */
  emoji: string;
  /** Short description */
  description: string;
};

/** Stored representation of an earned trophy. */
export type StoredTrophy = {
  id: string;
  unlockedAt: number;
};

const TROPHY_DEFINITIONS: Array<Trophy & {
  condition: (
    result: RoundResult,
    stats: PlayerStats,
    earned: string[],
  ) => boolean;
}> = [
  {
    id: "forste_bane",
    title: "Første bane",
    emoji: "🌟",
    description: "Fuldfør din allerførste bane",
    condition: (_r, _s, earned) => !earned.includes("forste_bane"),
  },
  {
    id: "stavemester",
    title: "Stavemester",
    emoji: "🏆",
    description: "Opnå score ≥ 90 på en bane",
    condition: (r) => r.score >= 90,
  },
  {
    id: "lynhurtig",
    title: "Lynhurtig",
    emoji: "🚀",
    description: "Fuldfør en bane med tidsscore ≥ 90",
    condition: (r) => r.timeScore >= 90,
  },
  {
    id: "fejlfri",
    title: "Fejlfri",
    emoji: "✨",
    description: "Fuldfør en bane med 0 fejl",
    condition: (r) => r.errors === 0,
  },
  {
    id: "pa_rekke",
    title: "På række",
    emoji: "🔥",
    description: "Stav 10 ord i træk uden fejl (inden for én bane)",
    condition: (r) => r.maxStreak >= 10,
  },
  {
    id: "flittig",
    title: "Flittig",
    emoji: "📚",
    description: "Fuldfør 5 baner i alt",
    condition: (_r, s) => s.totalRounds >= 5,
  },
  {
    id: "pa_vej_op",
    title: "På vej op",
    emoji: "📈",
    description: "Ryk op i niveau for første gang",
    condition: (r) => r.isRankUp,
  },
  {
    id: "bjergbestiger",
    title: "Bjergbestiger",
    emoji: "🏔️",
    description: "Nå niveau 10",
    condition: (_r, s) => s.currentRank >= 10,
  },
  {
    id: "ekspres",
    title: "Ekspres",
    emoji: "⚡",
    description: "Fuldfør en bane på under 3 minutter",
    condition: (r) => r.totalTime < 180,
  },
  {
    id: "regnbue",
    title: "Regnbue",
    emoji: "🌈",
    description: "Fuldfør baner på 5 forskellige niveauer",
    condition: (_r, s) => s.distinctDifficulties.length >= 5,
  },
  {
    id: "natteravn",
    title: "Natteravn",
    emoji: "🦉",
    description: "Nå niveau 25",
    condition: (_r, s) => s.currentRank >= 25,
  },
  {
    id: "kongen_af_ord",
    title: "Kongen af ord",
    emoji: "👑",
    description: "Nå niveau 50",
    condition: (_r, s) => s.currentRank >= 50,
  },
];

/**
 * Check trophy conditions and return newly unlocked trophies.
 *
 * Evaluates all trophy conditions against the round result and player stats,
 * returning only trophies not already in the earned list.
 *
 * @param result - The round result to check against
 * @param stats - Cumulative player statistics
 * @param earnedIds - IDs of previously earned trophies
 * @returns Array of newly unlocked trophies (empty if none)
 */
export function checkTrophies(
  result: RoundResult,
  stats: PlayerStats,
  earnedIds: string[],
): Trophy[] {
  const newlyUnlocked: Trophy[] = [];

  for (const def of TROPHY_DEFINITIONS) {
    if (earnedIds.includes(def.id)) continue;
    if (def.condition(result, stats, earnedIds)) {
      newlyUnlocked.push({
        id: def.id,
        title: def.title,
        emoji: def.emoji,
        description: def.description,
      });
    }
  }

  return newlyUnlocked;
}
