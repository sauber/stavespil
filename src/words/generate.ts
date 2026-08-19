// Download words from https://korpus.dsl.dk/download/freq-lemma.zip
export async function download(): Promise<Uint8Array> {
  const response = await fetch("https://korpus.dsl.dk/download/freq-lemma.zip");
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

// Extract words from file in zip archive
type WordEntry = {
  type: string;
  word: string;
  score: number;
};
export type WordList = Array<WordEntry>;
export async function extract(file: Uint8Array): Promise<WordList> {
  const { BlobReader, TextWriter, ZipReader } = await import("@zip-js/zip-js");
  const zipReader = new ZipReader(new BlobReader(new Blob([file as unknown as BlobPart])));
  const entries = await zipReader.getEntries();
  const writer = new TextWriter();
  const entry = entries[0];
  if (!entry || entry.directory) return [];
  const text = await entry.getData(writer);
  await zipReader.close();
  const lines = text.split("\n").filter((l: string) => l.trim());
  const result: WordList = [];
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length >= 3) {
      const type = parts[0].trim();
      const word = parts[1].trim();
      const score = parseFloat(parts[2].trim());
      if (!isNaN(score) && word.length > 0) {
        result.push({ type, word, score });
      }
    }
  }
  return result;
}

/** Pick most frequent unique words having 2 letters or more */
export function limitWords(source: WordList, count: number): WordList {
  const byWord = new Map<string, WordEntry>();
  for (const entry of source) {
    if (entry.word.length < 2) continue;
    const existing = byWord.get(entry.word);
    if (!existing || entry.score > existing.score) {
      byWord.set(entry.word, entry);
    }
  }
  return [...byWord.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

const DANISH_VOWELS = new Set("aeiouyæøå");

function countSyllables(word: string): number {
  const lower = word.toLowerCase();
  let count = 0;
  let prevWasVowel = false;
  for (const ch of lower) {
    const isVowel = DANISH_VOWELS.has(ch);
    if (isVowel && !prevWasVowel) count++;
    prevWasVowel = isVowel;
  }
  return Math.max(count, 1);
}

function danishPatternScore(word: string): number {
  const lower = word.toLowerCase();
  let score = 0;

  // Consonant clusters (3+): 0.04 per extra consonant beyond 2
  let i = 0;
  while (i < lower.length) {
    if (!DANISH_VOWELS.has(lower[i])) {
      let clusterLen = 0;
      while (i < lower.length && !DANISH_VOWELS.has(lower[i])) {
        clusterLen++;
        i++;
      }
      if (clusterLen >= 3) score += 0.04 * (clusterLen - 2);
    } else {
      i++;
    }
  }

  // Double consonants
  const dcMatches = lower.match(/([bdfgklmnprst])\1/g) || [];
  score += dcMatches.length * 0.08;

  // Silent d: vowel + d before consonant or end-of-word
  const silentDMatches = lower.match(/[aeiouyæøå]d(?=[bcdfghjklmnpqrstvwxz]|$)/g) || [];
  score += silentDMatches.length * 0.10;

  // Silent g: g between two vowels
  const silentGMatches = lower.match(/[aeiouyæøå]g[aeiouyæøå]/g) || [];
  score += silentGMatches.length * 0.10;

  // Silent h: word-initial hj- or hv-
  const silentHMatches = lower.match(/^(hj|hv)/g) || [];
  score += silentHMatches.length * 0.08;

  // -de ending
  if (lower.endsWith("de")) score += 0.06;

  // -ig ending
  if (lower.endsWith("ig")) score += 0.06;

  // r next to a vowel: count once per r
  for (let j = 0; j < lower.length; j++) {
    if (lower[j] === "r") {
      const prevIsVowel = j > 0 && DANISH_VOWELS.has(lower[j - 1]);
      const nextIsVowel = j < lower.length - 1 && DANISH_VOWELS.has(lower[j + 1]);
      if (prevIsVowel || nextIsVowel) score += 0.04;
    }
  }

  return score;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Calculate score for each word
export function scoreWords(source: WordList): WordList {
  const rawScores = source.map((entry) => ({
    entry,
    length: entry.word.length,
    syllables: countSyllables(entry.word),
    patterns: danishPatternScore(entry.word),
  }));

  const lengthMin = Math.min(...rawScores.map((s) => s.length));
  const lengthMax = Math.max(...rawScores.map((s) => s.length));
  const syllableMin = Math.min(...rawScores.map((s) => s.syllables));
  const syllableMax = Math.max(...rawScores.map((s) => s.syllables));
  const patternMax = Math.max(...rawScores.map((s) => s.patterns), 0.01);
  const freqLogMin = Math.log(Math.min(...source.map((w) => w.score)));
  const freqLogMax = Math.log(Math.max(...source.map((w) => w.score)));

  const scored = rawScores.map((s) => {
    const lenNorm = normalize(s.length, lengthMin, lengthMax);
    const freqNorm = 1 - normalize(Math.log(s.entry.score), freqLogMin, freqLogMax);
    const syllNorm = normalize(s.syllables, syllableMin, syllableMax);
    const patNorm = s.patterns / patternMax;
    const totalScore =
      0.25 * lenNorm +
      0.25 * freqNorm +
      0.20 * syllNorm +
      0.30 * patNorm;
    return { type: s.entry.type, word: s.entry.word, score: totalScore };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored;
}

// Group words by difficulty level
export type WordGroups = Array<WordList>;
export function wordGroups(source: WordList): WordGroups {
  const WORDS_PER_LEVEL = 20;
  const groups: WordGroups = [];
  for (let i = 0; i < source.length; i += WORDS_PER_LEVEL) {
    groups.push(source.slice(i, i + WORDS_PER_LEVEL));
  }
  return groups;
}

const DEFAULT_PATH = "public/words.json";

// Confirm words are stored
export async function existsWords(key?: string): Promise<boolean> {
  if (key) return localStorage.getItem(key) !== null;
  try {
    await Deno.stat(DEFAULT_PATH);
    return true;
  } catch {
    return false;
  }
}

// Store words
export async function storeWords(groups: WordGroups, key?: string): Promise<void> {
  if (key) {
    localStorage.setItem(key, JSON.stringify(groups));
    return;
  }
  await Deno.writeTextFile(DEFAULT_PATH, JSON.stringify(groups));
}

// Load words from localStorage (used by tests with custom keys)
export function retrieveWords(key = "wordList"): WordGroups {
  const data = localStorage.getItem(key);
  if (data === null) return [];
  return JSON.parse(data);
}

/** Ensure the word database exists, generating it if necessary. */
export async function ensureWords(): Promise<void> {
  if (await existsWords()) return;
  console.log("Generating word database…");
  const zip: Uint8Array = await download();
  const source: WordList = await extract(zip);
  const picked: WordList = limitWords(source, 2000);
  const scored: WordList = scoreWords(picked);
  const groups: WordGroups = wordGroups(scored);
  await storeWords(groups);
  console.log("Done.");
}

if (import.meta.main) {
  await ensureWords();
}
