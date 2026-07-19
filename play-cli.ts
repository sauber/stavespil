import { retrieveWords } from "./src/words/mod.ts";
import { loadProfile } from "./src/player/mod.ts";
import {
  selectWords,
  computeScore,
  calculateMaxStreak,
  calculateRankChange,
} from "./src/spell/mod.ts";
import type { WordResult } from "./src/spell/mod.ts";
import { imageLoader } from "./src/image/mod.ts";
import {
  flashWrong,
  initSlots,
  onInterrupt,
  printLine,
  readKey,
  renderSlots,
  setRawMode,
  showImage,
} from "./src/cli/mod.ts";

async function loadApiKey(): Promise<string> {
  const text = await Deno.readTextFile(".env");
  const match = text.match(/^PIXABAY_API_KEY=(.+)$/m);
  if (!match) throw new Error("PIXABAY_API_KEY not found in .env");
  return match[1].trim();
}

const groups = retrieveWords();
const profile = loadProfile();
const lastEntry = profile.roundHistory.at(-1);
const difficulty = lastEntry?.difficulty ?? 1;
const words = selectWords(groups, difficulty);

printLine(`Level ${difficulty}`);

const apiKey = await loadApiKey();
const loader = imageLoader(apiKey);

const wordResults: WordResult[] = [];

setRawMode(true);

try {
  onInterrupt(() => {
    setRawMode(false);
    Deno.exit(1);
  });

  for (const word of words) {
    const expected = [...word];

    printLine("");
    await showImage(loader, word);
    printLine(word);

    const startTime = Date.now();
    const slots = initSlots(word.length);
    let pos = 0;
    let errors = 0;
    renderSlots(slots);

    while (pos < expected.length) {
      const ch = await readKey();

      if (ch === "\x03") {
        setRawMode(false);
        Deno.exit(1);
      }

      if (ch === expected[pos]) {
        slots[pos] = ch;
        renderSlots(slots);
        pos++;
      } else {
        errors++;
        await flashWrong(slots, pos);
      }
    }

    const endTime = Date.now();
    wordResults.push({ word, errors, startTime, endTime });
  }
} finally {
  setRawMode(false);
}

const scoreResult = computeScore(wordResults, difficulty);
const maxStreak = calculateMaxStreak(wordResults);
const rankChange = calculateRankChange(scoreResult.combinedScore);
const rankSymbol = rankChange === 1 ? "↑" : rankChange === -1 ? "↓" : "→";

printLine("");
printLine("--- Result ---");
printLine(`Score:    ${scoreResult.combinedScore}`);
printLine(`Errors:   ${wordResults.reduce((s, r) => s + r.errors, 0)}`);
printLine(`Time:     ${scoreResult.totalTime}s`);
printLine(`Rank:     ${rankSymbol}`);
printLine(`Streak:   ${maxStreak}`);
