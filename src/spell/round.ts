import { retrieveWords } from "../words/generate.ts";
import type { WordList } from "../words/generate.ts";
import { createEngine } from "./engine.ts";
import { computeScore, calculateMaxStreak } from "./score.ts";
import type {
  EngineState,
  Media,
  MediaLoader,
  OnStateChange,
  RoundResult,
} from "./types.ts";

/** Configuration for creating a round. */
export type RoundConfig = {
  /** Difficulty level (1–100) */
  difficulty: number;
  /** Function that loads image bytes for a word */
  imageLoader: MediaLoader;
  /** Function that loads sound bytes for a word */
  soundLoader: MediaLoader;
  /** Callback for state updates */
  onStateChange: OnStateChange;
};

/** A completed round of spelling. */
export type Round = {
  /** Process a letter input from the player */
  enterLetter(letter: string): void;
  /** Advance to the next word (called after word-complete cheer) */
  nextWord(): void;
  /** Whether all words are completed */
  isComplete(): boolean;
  /** Get the final round result (only valid when isComplete) */
  getResult(): RoundResult;
  /** Get the selected words for this round */
  getWords(): string[];
};

/**
 * Select 20 words for a round from the word database.
 *
 * - 10 words from the chosen difficulty level
 * - 5 words from the level below (clamped)
 * - 5 words from the level above (clamped)
 *
 * All words are shuffled randomly.
 *
 * @param groups - All word groups from the database
 * @param difficulty - Chosen difficulty level (1–100)
 * @returns Array of 20 word strings
 */
export function selectWords(groups: WordList[], difficulty: number): string[] {
  const levelIndex = Math.max(0, Math.min(groups.length - 1, difficulty - 1));
  const belowIndex = Math.max(0, levelIndex - 1);
  const aboveIndex = Math.min(groups.length - 1, levelIndex + 1);

  const used = new Set<string>();

  const pick = (group: WordList, count: number): string[] => {
    const available = group.filter((e) => !used.has(e.word));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count).map((entry) => entry.word);
    for (const word of picked) used.add(word);
    return picked;
  };

  const words: string[] = [
    ...pick(groups[levelIndex], 10),
    ...pick(groups[belowIndex], 5),
    ...pick(groups[aboveIndex], 5),
  ];

  return shuffle(words);
}

/**
 * Fisher-Yates shuffle.
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Create and start a round of spelling.
 *
 * Loads words from the database, fetches media for all 20 words in parallel,
 * and returns a Round object that accepts letter input.
 *
 * @param config - Round configuration with difficulty, media loaders, and state callback
 * @returns A Round object for gameplay
 */
export async function createRound(config: RoundConfig): Promise<Round> {
  const groups = retrieveWords();
  if (groups.length === 0) {
    throw new Error("Word database not initialized. Run word generation first.");
  }

  const words = selectWords(groups, config.difficulty);

  const mediaPromises = words.map(
    async (word): Promise<Media> => {
      const [image, sound] = await Promise.all([
        config.imageLoader(word),
        config.soundLoader(word),
      ]);
      return { image, sound };
    },
  );
  const media = await Promise.all(mediaPromises);

  let completed = false;

  const wrappedOnStateChange: OnStateChange = (state: EngineState) => {
    if (state.isComplete) {
      completed = true;
    }
    config.onStateChange(state);
  };

  const engine = createEngine(words, media, wrappedOnStateChange);

  function enterLetter(letter: string): void {
    engine.enterLetter(letter);
  }

  function nextWord(): void {
    engine.nextWord();
  }

  function isComplete(): boolean {
    return completed;
  }

  function getResult(): RoundResult {
    if (!completed) {
      throw new Error("Round not yet completed");
    }

    const results = engine.getWordResults();
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const scoreResult = computeScore(results, config.difficulty);
    const maxStreak = calculateMaxStreak(results);

    return {
      score: scoreResult.combinedScore,
      errors: totalErrors,
      timeScore: scoreResult.timeScore,
      totalTime: scoreResult.totalTime,
      difficulty: config.difficulty,
      isRankUp: scoreResult.rankChange === 1,
      rankChange: scoreResult.rankChange,
      maxStreak,
    };
  }

  function getWords(): string[] {
    return [...words];
  }

  return { enterLetter, nextWord, isComplete, getResult, getWords };
}
