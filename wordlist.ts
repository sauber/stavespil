import { readFileSync, writeFileSync } from "fs";

const INPUT_FILE = "freq-30k-ex.txt";
const OUTPUT_FILE = "ord.json";
const WORDS_PER_LEVEL = 20;
const TOTAL_LEVELS = 100;
const TARGET_WORD_COUNT = WORDS_PER_LEVEL * TOTAL_LEVELS;

const CONTENT_WORD_TYPES = new Set(["NC", "A", "V"]);
const DANISH_VOWELS = new Set("aeiouyæøå");

interface WordEntry {
  type: string;
  word: string;
  frequency: number;
}

interface ScoredWord {
  word: string;
  frequency: number;
  totalScore: number;
}

function parseFrequencyFile(filePath: string): WordEntry[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const entries: WordEntry[] = [];

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length >= 3) {
      const type = parts[0].trim();
      const word = parts[1].trim();
      const frequency = parseFloat(parts[2].trim());
      if (!isNaN(frequency) && word.length > 0) {
        entries.push({ type, word, frequency });
      }
    }
  }
  return entries;
}

function deduplicate(entries: WordEntry[]): WordEntry[] {
  const seen = new Map<string, WordEntry>();
  for (const entry of entries) {
    const existing = seen.get(entry.word);
    if (!existing || entry.frequency > existing.frequency) {
      seen.set(entry.word, entry);
    }
  }
  return Array.from(seen.values());
}

function filterWords(entries: WordEntry[]): WordEntry[] {
  return entries.filter(
    (e) => e.word.length >= 3 && CONTENT_WORD_TYPES.has(e.type),
  );
}

function countSyllables(word: string): number {
  const lower = word.toLowerCase();
  let count = 0;
  let prevWasVowel = false;

  for (const ch of lower) {
    const isVowel = DANISH_VOWELS.has(ch);
    if (isVowel && !prevWasVowel) {
      count++;
    }
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
      if (clusterLen >= 2) {
        score += clusterLen - 1;
      }
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

function main() {
  console.log("Reading frequency file...");
  const entries = parseFrequencyFile(INPUT_FILE);
  console.log(`Total entries parsed: ${entries.length}`);

  const deduped = deduplicate(entries);
  console.log(`After deduplication: ${deduped.length}`);

  const filtered = filterWords(deduped);
  console.log(
    `After filtering (3+ chars, nouns/adjectives/verbs): ${filtered.length}`,
  );

  const byType: Record<string, number> = {};
  for (const e of filtered) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }
  console.log("Word type distribution:", byType);

  filtered.sort((a, b) => b.frequency - a.frequency);
  const topWords = filtered.slice(0, TARGET_WORD_COUNT);
  console.log(`Selected top ${topWords.length} words by frequency`);

  const rawScores = topWords.map((entry) => ({
    word: entry.word,
    frequency: entry.frequency,
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

  const freqLogMin = Math.log(Math.min(...rawScores.map((s) => s.frequency)));
  const freqLogMax = Math.log(Math.max(...rawScores.map((s) => s.frequency)));

  const scored: ScoredWord[] = rawScores.map((s) => {
    const lenNorm = normalize(s.length, lengthMin, lengthMax);
    const freqNorm =
      1 - normalize(Math.log(s.frequency), freqLogMin, freqLogMax);
    const syllNorm = normalize(s.syllables, syllableMin, syllableMax);
    const phonNorm = normalize(s.phonetic, phoneticMin, phoneticMax);
    const clustNorm = normalize(s.clusters, clusterMin, clusterMax);

    const totalScore =
      0.30 * lenNorm +
      0.25 * freqNorm +
      0.20 * syllNorm +
      0.15 * phonNorm +
      0.10 * clustNorm;

    return { word: s.word, frequency: s.frequency, totalScore };
  });

  scored.sort((a, b) => a.totalScore - b.totalScore);

  const levels: Record<string, string[]> = {};
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const start = (level - 1) * WORDS_PER_LEVEL;
    const end = start + WORDS_PER_LEVEL;
    levels[String(level)] = scored.slice(start, end).map((s) => s.word);
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(levels, null, 2), "utf-8");
  console.log(`\nWritten ${OUTPUT_FILE}`);

  console.log("\n--- Difficulty distribution ---");
  console.log(
    `Score range: ${scored[0].totalScore.toFixed(4)} - ${scored[scored.length - 1].totalScore.toFixed(4)}`,
  );

  console.log("\n--- Sample levels ---");
  for (const l of [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 98, 99, 100]) {
    const words = levels[String(l)];
    if (words) {
      console.log(`Level ${l}: ${words.join(", ")}`);
    }
  }

  console.log("\n--- Length stats per level tier ---");
  const tiers = [
    { name: "Levels 1-10", from: 1, to: 10 },
    { name: "Levels 11-25", from: 11, to: 25 },
    { name: "Levels 26-50", from: 26, to: 50 },
    { name: "Levels 51-75", from: 51, to: 75 },
    { name: "Levels 76-90", from: 76, to: 90 },
    { name: "Levels 91-100", from: 91, to: 100 },
  ];
  for (const tier of tiers) {
    const tierWords: string[] = [];
    for (let l = tier.from; l <= tier.to; l++) {
      tierWords.push(...(levels[String(l)] || []));
    }
    const avgLen =
      tierWords.reduce((sum, w) => sum + w.length, 0) / tierWords.length;
    const avgSyll =
      tierWords.reduce((sum, w) => sum + countSyllables(w), 0) /
      tierWords.length;
    console.log(
      `${tier.name}: avg length ${avgLen.toFixed(1)}, avg syllables ${avgSyll.toFixed(1)}`,
    );
  }
}

main();
