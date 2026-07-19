import type {
  Cheer,
  EngineState,
  PlayerStats,
  RoundResult,
} from "../gameState/mod.ts";

export type { Cheer, EngineState, PlayerStats, RoundResult };

/** Result of a single word within a round. */
export type WordResult = {
  /** The word that was spelled */
  word: string;
  /** Number of wrong letters entered for this word */
  errors: number;
  /** Date.now() when the word started */
  startTime: number;
  /** Date.now() when the word was completed */
  endTime: number;
};

/** Score breakdown for a completed round (internal to spell module). */
export type ScoreResult = {
  /** Error rate score (0–100) */
  errorScore: number;
  /** Time score (0–100) */
  timeScore: number;
  /** Weighted combined score (0–100) */
  combinedScore: number;
  /** Recommended rank change */
  rankChange: -1 | 0 | 1;
  /** Total round time in seconds */
  totalTime: number;
};

/** Media data for a single word. */
export type Media = {
  /** Raw image bytes */
  image: Uint8Array;
  /** Raw sound bytes */
  sound: Uint8Array;
};

/** Callback signature for engine state updates. */
export type OnStateChange = (state: EngineState) => void;

/** Function that loads media for a word. */
export type MediaLoader = (word: string) => Promise<Uint8Array>;
