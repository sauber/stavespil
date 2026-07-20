import { ensureWords } from "./src/words/mod.ts";
import { calculateNewRank, loadProfile, saveProfile } from "./src/player/mod.ts";
import { createRound } from "./src/spell/mod.ts";
import type { EngineState, MediaLoader } from "./src/spell/mod.ts";
import { imageLoader } from "./src/image/mod.ts";
import {
  flashWrong,
  printLine,
  renderSlots,
  setRawMode,
  showImageBytes,
} from "./src/cli/mod.ts";
import { onInterrupt, readKey } from "./src/cli/mod.ts";

async function loadApiKey(): Promise<string> {
  const text = await Deno.readTextFile(".env");
  const match = text.match(/^PIXABAY_API_KEY=(.+)$/m);
  if (!match) throw new Error("PIXABAY_API_KEY not found in .env");
  return match[1].trim();
}

await ensureWords();
const profile = loadProfile();
const lastEntry = profile.roundHistory.at(-1);
const difficulty = lastEntry?.newRank ?? 1;

for (const entry of profile.roundHistory.slice(-5)) {
  const sym = entry.result === 1 ? "↑" : entry.result === -1 ? "↓" : "→";
  printLine(
    `Level ${entry.difficulty}, Rank ${sym}, Errors ${entry.errors}, Time ${entry.totalTime}s`,
  );
}

const apiKey = await loadApiKey();
const imageLoaderFn = imageLoader(apiKey, true);
const noopSoundLoader: MediaLoader = () => Promise.resolve(new Uint8Array(0));

let displayedWordIndex = -1;
let latestState!: EngineState;
let newWordPending = false;
let pendingAdvance = false;

const round = await createRound({
  difficulty,
  imageLoader: imageLoaderFn,
  soundLoader: noopSoundLoader,
  onStateChange: (state: EngineState) => {
    latestState = state;

    if (state.wordIndex !== displayedWordIndex) {
      newWordPending = true;
    }

    if (!newWordPending && displayedWordIndex >= 0) {
      const slots = state.frames.map((f) => f ?? "_");
      renderSlots(slots);
    }

    if (state.cheer) {
      printLine("");
      printLine(`${state.cheer.emoji} ${state.cheer.text}`);
    }

    if (state.isWordComplete && !state.isComplete) {
      pendingAdvance = true;
    }
  },
});

const words = round.getWords();

printLine(`Level ${difficulty}`);

setRawMode(true);

try {
  onInterrupt(() => {
    setRawMode(false);
    Deno.exit(1);
  });

  while (!round.isComplete()) {
    if (newWordPending) {
      newWordPending = false;
      displayedWordIndex = latestState.wordIndex;
      printLine("");
      printLine(
        `Level ${difficulty} Word #${displayedWordIndex + 1} of ${latestState.totalWords}: ${words[displayedWordIndex]}`,
      );
      await showImageBytes(latestState.image);
      const slots = latestState.frames.map((f) => f ?? "_");
      renderSlots(slots);
    }

    if (pendingAdvance) {
      pendingAdvance = false;
      round.nextWord();
      continue;
    }

    const ch = await readKey();

    if (ch === "\x03") {
      setRawMode(false);
      Deno.exit(1);
    }

    const currentWord = words[latestState.wordIndex];
    const nextPos = latestState.frames.filter((f) => f !== null).length;
    if (ch.toLowerCase() !== currentWord[nextPos].toLowerCase()) {
      const tempSlots = latestState.frames.map((f) => f ?? "_");
      await flashWrong(tempSlots, nextPos, ch);
    }

    round.enterLetter(ch);
  }
} finally {
  setRawMode(false);
}

const result = round.getResult();
const rankSymbol =
  result.rankChange === 1 ? "↑" : result.rankChange === -1 ? "↓" : "→";

printLine("");
printLine("--- Result ---");
printLine(`Score:    ${result.score}`);
printLine(`Errors:   ${result.errors}`);
printLine(`Time:     ${result.totalTime}s`);
printLine(`Rank:     ${rankSymbol}`);
printLine(`Streak:   ${result.maxStreak}`);

const currentRank = lastEntry?.newRank ?? 1;
const newRank = calculateNewRank(currentRank, difficulty, result.rankChange);

profile.roundHistory.push({
  difficulty,
  result: result.rankChange,
  newRank,
  errors: result.errors,
  totalTime: result.totalTime,
  trophiesUnlocked: [],
  timestamp: Date.now(),
});
saveProfile(profile);

printLine("");
printLine("Billeder fra Pixabay (pixabay.com)");
