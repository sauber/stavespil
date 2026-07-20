import type { WordGroups } from "./generate.ts";

export async function loadWords(): Promise<WordGroups> {
  const response = await fetch("/words.json");
  if (!response.ok) {
    throw new Error(`Failed to load words: ${response.status}`);
  }
  return response.json();
}
