/** Result of a completed level, used for trophy checking. */
export type LevelResult = {
  /** Combined score (0–100) */
  score: number;
  /** Total errors across all words */
  errors: number;
  /** Time score (0–100) */
  timeScore: number;
  /** Total time in seconds */
  totalTime: number;
  /** Level number played */
  levelNumber: number;
  /** Whether player leveled up */
  isLevelUp: boolean;
  /** Longest streak of consecutive correct words in this level */
  maxStreak: number;
};

/** Cumulative player statistics for trophy checking. */
export type PlayerStats = {
  /** Total number of levels completed */
  totalGames: number;
  /** Distinct level numbers played */
  levelsSeen: number[];
  /** Current player level */
  currentLevel: number;
};

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
type StoredTrophy = {
  id: string;
  unlockedAt: number;
};

const STORAGE_KEY = "trophies";

const TROPHY_DEFINITIONS: Array<Trophy & {
  condition: (result: LevelResult, stats: PlayerStats, earned: string[]) => boolean;
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
    condition: (_r, s) => s.totalGames >= 5,
  },
  {
    id: "pa_vej_op",
    title: "På vej op",
    emoji: "📈",
    description: "Ryk op i niveau for første gang",
    condition: (r) => r.isLevelUp,
  },
  {
    id: "bjergbestiger",
    title: "Bjergbestiger",
    emoji: "🏔️",
    description: "Nå niveau 10",
    condition: (_r, s) => s.currentLevel >= 10,
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
    condition: (_r, s) => s.levelsSeen.length >= 5,
  },
  {
    id: "natteravn",
    title: "Natteravn",
    emoji: "🦉",
    description: "Nå niveau 25",
    condition: (_r, s) => s.currentLevel >= 25,
  },
  {
    id: "kongen_af_ord",
    title: "Kongen af ord",
    emoji: "👑",
    description: "Nå niveau 50",
    condition: (_r, s) => s.currentLevel >= 50,
  },
];

function loadEarned(): StoredTrophy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredTrophy[];
  } catch {
    return [];
  }
}

function saveEarned(earned: StoredTrophy[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(earned));
}

/**
 * Check trophy conditions and return newly unlocked trophies.
 *
 * Reads existing trophies from localStorage, evaluates all conditions,
 * saves any newly earned trophies, and returns them.
 *
 * @param result - The level result to check against
 * @param stats - Cumulative player statistics
 * @returns Array of newly unlocked trophies (empty if none)
 */
export function checkTrophies(
  result: LevelResult,
  stats: PlayerStats,
): Trophy[] {
  const earned = loadEarned();
  const earnedIds = earned.map((t) => t.id);
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
      earned.push({ id: def.id, unlockedAt: Date.now() });
    }
  }

  if (newlyUnlocked.length > 0) {
    saveEarned(earned);
  }

  return newlyUnlocked;
}

/**
 * Get all earned trophies from storage.
 *
 * @returns Array of stored trophies with unlock timestamps
 */
export function getEarnedTrophies(): StoredTrophy[] {
  return loadEarned();
}

/**
 * Clear all earned trophies from storage.
 * Used for testing.
 */
export function clearTrophies(): void {
  localStorage.removeItem(STORAGE_KEY);
}
