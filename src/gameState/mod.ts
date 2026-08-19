/** Input for the cheer function on each letter keypress. */
export type CheerInput = {
  /** The word being spelled */
  word: string;
  /** Index of the letter just entered (0-based) */
  letterIndex: number;
  /** Whether the entered letter was correct */
  isCorrect: boolean;
  /** Number of wrong letters entered for this word so far */
  errorCount: number;
  /** Whether the word was just completed correctly */
  isWordComplete: boolean;
};

/** A cheer message to display to the player. */
export type Cheer = {
  /** Danish message text */
  text: string;
  /** Emoji to display */
  emoji: string;
  /** Visual style variant */
  style:
    | "neutral"
    | "helpful"
    | "encouraging"
    | "reference"
    | "celebrated"
    | "milestone";
  /** Display duration in milliseconds */
  duration: number;
};

/** Result of a completed round. Used by trophy and player modules. */
export type RoundResult = {
  /** Combined score (0–100) */
  score: number;
  /** Total errors across all words */
  errors: number;
  /** Time score (0–100) */
  timeScore: number;
  /** Total time in seconds */
  totalTime: number;
  /** Difficulty played */
  difficulty: number;
  /** Whether player ranked up */
  isRankUp: boolean;
  /** Rank change: +1 (up), 0 (unchanged), −1 (down) */
  rankChange: -1 | 0 | 1;
  /** Longest streak of consecutive correct words in this round */
  maxStreak: number;
};

/** Cumulative player statistics for trophy checking. */
export type PlayerStats = {
  /** Total number of rounds completed */
  totalRounds: number;
  /** Distinct difficulty numbers played */
  distinctDifficulties: number[];
  /** Current player rank */
  currentRank: number;
};

/** Complete state snapshot pushed to renderer on every change. */
export type EngineState = {
  /** Index of the current word (0–19) */
  wordIndex: number;
  /** Total number of words in the round */
  totalWords: number;
  /** Letter frames: filled positions have the letter, unfilled are null */
  frames: (string | null)[];
  /** Current word's image data */
  image: Uint8Array;
  /** Current word's sound data */
  sound: Uint8Array;
  /** Feedback message from the reward module, or null */
  cheer: Cheer | null;
  /** True when the current word was just completed */
  isWordComplete: boolean;
  /** True when all 20 words are completed */
  isComplete: boolean;
  /** Number of wrong letters on the current word */
  wordErrors: number;
  /** Cumulative wrong letters across all words */
  totalErrors: number;
  /** Unique letters in the current word (for keyboard rendering) */
  wordLetters: string[];
  /** The current word being spelled */
  word: string;
};
