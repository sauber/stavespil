import { onLetterInput, resetLevel } from "../reward/mod.ts";
import type { Cheer, CheerInput } from "../gameState/mod.ts";
import type { EngineState, Media, OnStateChange, WordResult } from "./types.ts";

/** Internal engine state. */
type InternalState = {
  currentWordIndex: number;
  frames: (string | null)[];
  wordErrors: number;
  totalErrors: number;
  startTime: number;
  wordResults: WordResult[];
  isWordComplete: boolean;
  isComplete: boolean;
  cheer: Cheer | null;
};

/**
 * Create a game engine for one round of spelling.
 *
 * The engine validates letter input, tracks progress, and communicates state
 * changes via the provided callback. It does not depend on any external
 * environment (browser, CLI, storage).
 *
 * @param words - The 20 selected words for this round
 * @param media - Pre-fetched media (image + sound) for each word
 * @param onStateChange - Callback invoked on every state change
 * @returns Engine object with enterLetter, nextWord, and getWordResults methods
 */
export function createEngine(
  words: string[],
  media: Media[],
  onStateChange: OnStateChange,
): {
  enterLetter(letter: string): void;
  nextWord(): void;
  getWordResults(): WordResult[];
} {
  const totalWords = words.length;

  function makeFrames(word: string): (string | null)[] {
    return Array.from({ length: word.length }, () => null);
  }

  function uniqueLetters(word: string): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const ch of word.toLowerCase()) {
      if (!seen.has(ch)) {
        seen.add(ch);
        result.push(ch);
      }
    }
    return result;
  }

  function buildState(state: InternalState): EngineState {
    const word = words[state.currentWordIndex];
    return {
      wordIndex: state.currentWordIndex,
      totalWords,
      frames: [...state.frames],
      image: media[state.currentWordIndex].image,
      sound: media[state.currentWordIndex].sound,
      cheer: state.cheer,
      isWordComplete: state.isWordComplete,
      isComplete: state.isComplete,
      wordErrors: state.wordErrors,
      totalErrors: state.totalErrors,
      wordLetters: uniqueLetters(word),
      word,
    };
  }

  const state: InternalState = {
    currentWordIndex: 0,
    frames: makeFrames(words[0]),
    wordErrors: 0,
    totalErrors: 0,
    startTime: Date.now(),
    wordResults: [],
    isWordComplete: false,
    isComplete: false,
    cheer: null,
  };

  resetLevel();
  onStateChange(buildState(state));

  function enterLetter(letter: string): void {
    if (state.isComplete) return;
    if (state.isWordComplete) return;

    const word = words[state.currentWordIndex];
    const position = state.frames.filter((f) => f !== null).length;
    const expected = word[position];

    const isCorrect =
      letter.toLowerCase() === expected.toLowerCase();

    if (isCorrect) {
      state.frames[position] = letter;
    } else {
      state.wordErrors++;
      state.totalErrors++;
    }

    const cheerInput: CheerInput = {
      word,
      letterIndex: position,
      isCorrect,
      errorCount: state.wordErrors,
      isWordComplete: false,
    };

    state.cheer = onLetterInput(cheerInput);

    const filledCount = state.frames.filter((f) => f !== null).length;
    if (filledCount === word.length) {
      state.isWordComplete = true;
      state.wordResults.push({
        word,
        errors: state.wordErrors,
        startTime: state.startTime,
        endTime: Date.now(),
      });

      const completeInput: CheerInput = {
        word,
        letterIndex: position,
        isCorrect: true,
        errorCount: state.wordErrors,
        isWordComplete: true,
      };
      state.cheer = onLetterInput(completeInput);
    }

    onStateChange(buildState(state));
  }

  function nextWord(): void {
    if (state.isComplete) return;
    if (!state.isWordComplete) return;

    if (state.currentWordIndex < totalWords - 1) {
      state.currentWordIndex++;
      state.frames = makeFrames(words[state.currentWordIndex]);
      state.wordErrors = 0;
      state.isWordComplete = false;
      state.startTime = Date.now();
      state.cheer = null;
    } else {
      state.isComplete = true;
    }

    onStateChange(buildState(state));
  }

  function getWordResults(): WordResult[] {
    return [...state.wordResults];
  }

  return { enterLetter, nextWord, getWordResults };
}
