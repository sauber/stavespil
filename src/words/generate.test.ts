import { assertEquals, assert } from "@std/assert";
import { BlobWriter, TextReader, ZipWriter } from "@zip-js/zip-js";
import { limitWords, wordGroups, scoreWords, extract, download, existsWords, storeWords, retrieveWords } from "./generate.ts";

Deno.test("limitWords filters words with less than 2 characters", () => {
  const source = [
    { type: "NC", word: "a", score: 0.1 },
    { type: "NC", word: "kat", score: 0.2 },
    { type: "NC", word: "b", score: 0.3 },
  ];
  const result = limitWords(source, 10);
  assertEquals(result.length, 1);
  assertEquals(result[0].word, "kat");
});

Deno.test("limitWords picks most frequent words by score descending", () => {
  const source = [
    { type: "NC", word: "hus", score: 0.1 },
    { type: "NC", word: "bil", score: 0.5 },
    { type: "NC", word: "kat", score: 0.3 },
    { type: "NC", word: "dog", score: 0.9 },
  ];
  const result = limitWords(source, 3);
  assertEquals(result.length, 3);
  assertEquals(result[0].word, "dog");
  assertEquals(result[1].word, "bil");
  assertEquals(result[2].word, "kat");
});

Deno.test("limitWords returns at most count words", () => {
  const source = [
    { type: "NC", word: "ab", score: 0.1 },
    { type: "NC", word: "cd", score: 0.2 },
    { type: "NC", word: "ef", score: 0.3 },
    { type: "NC", word: "gh", score: 0.4 },
    { type: "NC", word: "ij", score: 0.5 },
  ];
  const result = limitWords(source, 2);
  assertEquals(result.length, 2);
  assertEquals(result[0].word, "ij");
  assertEquals(result[1].word, "gh");
});

Deno.test("limitWords returns empty array when no words have 2+ chars", () => {
  const source = [
    { type: "NC", word: "a", score: 0.1 },
    { type: "NC", word: "b", score: 0.2 },
  ];
  const result = limitWords(source, 10);
  assertEquals(result.length, 0);
});

Deno.test("wordGroups divides words into equal groups of 20", () => {
  const words = Array.from({ length: 2000 }, (_, i) => ({
    type: "NC",
    word: `w${i}`,
    score: i,
  }));
  const groups = wordGroups(words);
  assertEquals(groups.length, 100);
  for (const group of groups) {
    assertEquals(group.length, 20);
  }
});

Deno.test("wordGroups preserves word order across groups", () => {
  const words = Array.from({ length: 60 }, (_, i) => ({
    type: "NC",
    word: `w${i}`,
    score: i,
  }));
  const groups = wordGroups(words);
  assertEquals(groups.length, 3);
  assertEquals(groups[0][0].word, "w0");
  assertEquals(groups[0][19].word, "w19");
  assertEquals(groups[1][0].word, "w20");
  assertEquals(groups[2][0].word, "w40");
});

Deno.test("wordGroups returns empty array for empty input", () => {
  const groups = wordGroups([]);
  assertEquals(groups.length, 0);
});

Deno.test("scoreWords assigns scores between 0 and 1", () => {
  const source = [
    { type: "NC", word: "kat", score: 0.5 },
    { type: "NC", word: "elefant", score: 0.1 },
  ];
  const result = scoreWords(source);
  for (const entry of result) {
    assert(entry.score >= 0 && entry.score <= 1, `Score ${entry.score} out of range`);
  }
});

Deno.test("scoreWords replaces frequency with difficulty score", () => {
  const source = [
    { type: "NC", word: "kat", score: 0.9 },
    { type: "NC", word: "elefant", score: 0.1 },
  ];
  const result = scoreWords(source);
  const kat = result.find((w) => w.word === "kat")!;
  const elefant = result.find((w) => w.word === "elefant")!;
  assert(kat.score !== 0.9, "kat score should be replaced, not kept as frequency");
  assert(elefant.score !== 0.1, "elefant score should be replaced, not kept as frequency");
});

Deno.test("scoreWords sorts by difficulty ascending (easiest first)", () => {
  const source = [
    { type: "NC", word: "elefant", score: 0.9 },
    { type: "NC", word: "kat", score: 0.1 },
  ];
  const result = scoreWords(source);
  assertEquals(result[0].word, "kat");
  assertEquals(result[1].word, "elefant");
});

async function createZip(filename: string, content: string): Promise<Uint8Array> {
  const writer = new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(writer);
  await zipWriter.add(filename, new TextReader(content));
  await zipWriter.close();
  const blob = await writer.getData();
  return new Uint8Array(await blob.arrayBuffer());
}

Deno.test("extract parses TSV from zip archive", async () => {
  const tsv = "NC\tkat\t0.5\nA\tstor\t0.3\nV\tløbe\t0.1\n";
  const zip = await createZip("freq-30k-ex.txt", tsv);
  const result = await extract(zip);
  assertEquals(result.length, 3);
  assertEquals(result[0].word, "kat");
  assertEquals(result[0].score, 0.5);
  assertEquals(result[1].word, "stor");
  assertEquals(result[2].word, "løbe");
});

Deno.test("extract skips malformed lines", async () => {
  const tsv = "NC\tkat\t0.5\nbad line\nA\tstor\t0.3\n";
  const zip = await createZip("freq-30k-ex.txt", tsv);
  const result = await extract(zip);
  assertEquals(result.length, 2);
});

Deno.test({
  name: "download returns zip data that can be extracted",
  ignore: true,
  permissions: { net: true },
}, async () => {
  const data = await download();
  assert(data.length > 0, "Downloaded data should not be empty");
  const words = await extract(data);
  assert(words.length > 0, "Extracted words should not be empty");
  assert(words[0].word.length > 0, "First word should have content");
});

Deno.test("existsWords returns false when no cache", async () => {
  localStorage.removeItem("wordList-test");
  assertEquals(await existsWords("wordList-test"), false);
});

Deno.test("storeWords and retrieveWords round-trip", async () => {
  const groups = [
    [{ type: "NC", word: "kat", score: 0.5 }],
    [{ type: "A", word: "stor", score: 0.3 }],
  ];
  await storeWords(groups, "wordList-test");
  const retrieved = retrieveWords("wordList-test");
  assertEquals(retrieved, groups);
  assertEquals(await existsWords("wordList-test"), true);
  localStorage.removeItem("wordList-test");
});
