import type { Cheer, CheerInput } from "../gameState/mod.ts";

export type { Cheer, CheerInput };

const WRONG_MESSAGES: Array<{
  text: string;
  emoji: string;
  style: Cheer["style"];
}> = [
  { text: "Ups! Prøv igen", emoji: "😊", style: "neutral" },
  { text: "Tænk på lyden!", emoji: "👂", style: "helpful" },
  { text: "Du kan godt!", emoji: "💪", style: "encouraging" },
  { text: "Se bogstaverne der lyser!", emoji: "💡", style: "reference" },
];

const PERFECT_MESSAGE: Cheer = {
  text: "Perfekt!",
  emoji: "⭐",
  style: "celebrated",
  duration: 2000,
};

const GOOD_MESSAGE: Cheer = {
  text: "Godt klaret!",
  emoji: "👍",
  style: "encouraging",
  duration: 2000,
};

const STREAK_MESSAGE: Cheer = {
  text: "Fantastisk streak!",
  emoji: "🔥",
  style: "milestone",
  duration: 3000,
};

const DEFAULT_DURATION = 2000;
const STREAK_THRESHOLD = 5;

let streakCount = 0;

/**
 * Process a letter input and return a cheer message, or null.
 *
 * Call this on every keypress during gameplay. The function tracks streaks
 * internally across words within a level.
 *
 * @param input - The letter input event data
 * @returns A cheer message or null if no message should be shown
 */
export function onLetterInput(input: CheerInput): Cheer | null {
  if (input.isWordComplete) {
    if (input.errorCount === 0) {
      streakCount++;
      if (streakCount >= STREAK_THRESHOLD) {
        return STREAK_MESSAGE;
      }
      return PERFECT_MESSAGE;
    }
    streakCount = 0;
    if (input.errorCount <= 2) {
      return GOOD_MESSAGE;
    }
    return null;
  }

  if (!input.isCorrect) {
    streakCount = 0;
    const index = Math.min(input.errorCount - 1, WRONG_MESSAGES.length - 1);
    const msg = WRONG_MESSAGES[index];
    return { ...msg, duration: DEFAULT_DURATION };
  }

  return null;
}

/**
 * Reset all internal state for a new level.
 * Must be called when a new level starts.
 */
export function resetLevel(): void {
  streakCount = 0;
}
