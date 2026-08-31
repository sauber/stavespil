import { existsWords, retrieveWords, type WordGroups } from "./generate.ts";

// Shuffle array of strings
const shuffle = (words: Array<string>) =>
  words.sort((_) => Math.random() - 0.5);

// Confirm word list retrieved
const generated: boolean = await existsWords();
if (!generated) throw new Error("Word list is not cached");

// Print out some words from wordlist
const groups: WordGroups = retrieveWords();
for (let l = 0; l < groups.length; l++) {
  const group: Array<string> = groups[l];
  const words: Array<string> = shuffle(group).slice(0, 3);
  words.push("...");
  console.log(`Level ${l + 1}: ${words.join(", ")}`);
}
