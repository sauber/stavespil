import { retrieveWords } from "./src/words/mod.ts";
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
const word = groups[0][0].word;
const expected = [...word];

const apiKey = await loadApiKey();
const loader = imageLoader(apiKey);
await showImage(loader, word);
printLine(word);

const slots = initSlots(word.length);
let pos = 0;
renderSlots(slots);
setRawMode(true);

try {
  onInterrupt(() => {
    setRawMode(false);
    Deno.exit(1);
  });

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
      await flashWrong(slots, pos);
    }
  }
} finally {
  setRawMode(false);
}
