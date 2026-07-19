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

/** Pick most frequent words having 2 letters or more */
export function limitWords(source: WordList, count: number): WordList {
  return source
    .filter((w) => w.word.length >= 2)
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

function phoneticComplexity(word: string): number {
  const lower = word.toLowerCase();
  let score = 0;
  if (lower.includes("æ")) score += 0.15;
  if (lower.includes("ø")) score += 0.15;
  if (lower.includes("å")) score += 0.15;
  const skCount = (lower.match(/sk/g) || []).length;
  score += Math.min(skCount * 0.08, 0.16);
  const dcMatches = lower.match(/([bdfgklmnprst])\1/g) || [];
  score += Math.min(dcMatches.length * 0.04, 0.2);
  const silentDMatches = lower.match(/[aeiouyæøå]d/g) || [];
  score += Math.min(silentDMatches.length * 0.03, 0.15);
  if (lower.endsWith("dt") || lower.endsWith("gt")) score += 0.1;
  return Math.min(score, 1);
}

function consonantClusterScore(word: string): number {
  const lower = word.toLowerCase();
  let score = 0;
  let i = 0;
  while (i < lower.length) {
    if (!DANISH_VOWELS.has(lower[i])) {
      let clusterLen = 0;
      while (i < lower.length && !DANISH_VOWELS.has(lower[i])) {
        clusterLen++;
        i++;
      }
      if (clusterLen >= 2) score += clusterLen - 1;
    } else {
      i++;
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
    phonetic: phoneticComplexity(entry.word),
    clusters: consonantClusterScore(entry.word),
  }));

  const lengthMin = Math.min(...rawScores.map((s) => s.length));
  const lengthMax = Math.max(...rawScores.map((s) => s.length));
  const syllableMin = Math.min(...rawScores.map((s) => s.syllables));
  const syllableMax = Math.max(...rawScores.map((s) => s.syllables));
  const phoneticMin = Math.min(...rawScores.map((s) => s.phonetic));
  const phoneticMax = Math.max(...rawScores.map((s) => s.phonetic));
  const clusterMin = Math.min(...rawScores.map((s) => s.clusters));
  const clusterMax = Math.max(...rawScores.map((s) => s.clusters));
  const freqLogMin = Math.log(Math.min(...source.map((w) => w.score)));
  const freqLogMax = Math.log(Math.max(...source.map((w) => w.score)));

  const scored = rawScores.map((s) => {
    const lenNorm = normalize(s.length, lengthMin, lengthMax);
    const freqNorm = 1 - normalize(Math.log(s.entry.score), freqLogMin, freqLogMax);
    const syllNorm = normalize(s.syllables, syllableMin, syllableMax);
    const phonNorm = normalize(s.phonetic, phoneticMin, phoneticMax);
    const clustNorm = normalize(s.clusters, clusterMin, clusterMax);
    const totalScore =
      0.30 * lenNorm +
      0.25 * freqNorm +
      0.20 * syllNorm +
      0.15 * phonNorm +
      0.10 * clustNorm;
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

// Confirm words are stored in cache
export function existsWords(key = "wordList"): boolean {
  return localStorage.getItem(key) !== null;
}

// Store words in cache
export function storeWords(groups: WordGroups, key = "wordList"): void {
  localStorage.setItem(key, JSON.stringify(groups));
}

// Load words from cache
export function retrieveWords(key = "wordList"): WordGroups {
  const data = localStorage.getItem(key);
  if (data === null) return [];
  return JSON.parse(data);
}

// Main
if (import.meta.main) {
  console.log("Generating word list");
  const zip: Uint8Array = await download();
  const source: WordList = await extract(zip);
  const picked: WordList = limitWords(source, 2000);
  const scored: WordList = scoreWords(picked);
  const groups: WordGroups = wordGroups(scored);
  await storeWords(groups);
  console.log("Done.");
}
