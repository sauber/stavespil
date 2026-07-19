# StaveSpil

A game training kids to spell Danish words.

- Language: Deno
- Core game module in `src/` folder.
- Test driven development.
  - For example `src/score/calculate.test.ts` has test cases for
    `src/score/calculate.ts`.
  - Complete one test case, implementation and verification at a time.
- Use jsr modules, not npm modules.
- Use jsr:@std/assert for testing
- SOLID coding principles
- All public symbols are documented using JSdoc
- Architecture and game rules in `StaveSpil.md` file.
- Design choices in `DESIGN.md` for each module.
- Confirm code quality with `deno check`, `deno lint` and `deno test`.
- Export methods and types in each dir from `mod.ts` file.
- Keep requirements and design choices seperated and documented in DESIGN.md
  file in each folder. For example a requirement could be "a number of levels of
  increased difficulty" and a specific design for same requirement could be
  "divide 2000 words into 100 levels by spelling difficulty with equal amount of
  words in each level".

## Entities

| Name           | Concept                                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| **rank**       | Player skill assessment (1–100)                                              |
| **difficulty** | Word difficulty groups (1–100 levels)                                        |
| **round**      | One round of spelling (20 words, determines rank change)                     |
| **streak**     | Consecutive words spelled correctly without errors within a round            |
| **cheer**      | Inline feedback message shown during gameplay (text + emoji + style)         |
| **trophy**     | Persistent achievement earned once when a condition is met                   |
| **score**      | Combined performance score (0–100) weighting error rate (60%) and time (40%) |
| **profile**    | Player's persistent data (round history, stored in localStorage)             |
| **wordEntry**  | A single word with its type, text, and frequency/difficulty score            |
| **wordGroups** | Words divided into 100 equal groups by difficulty (20 words each)            |

## Code Naming

| Kind             | Convention       | Examples                                    |
| ---------------- | ---------------- | ------------------------------------------- |
| Functions        | camelCase        | `getWordPicture`, `onLetterInput`           |
| Variables        | camelCase        | `streakCount`, `cacheKey`                   |
| Constants        | UPPER_SNAKE_CASE | `CACHE_KEY`, `STREAK_THRESHOLD`             |
| Types/Interfaces | PascalCase       | `CheerInput`, `RoundResult`, `WordEntry`    |

## File Naming

| Kind | Convention | Examples |
| --- | --- | --- |
| Markdown docs | UPPERCASE.md | `DESIGN.md`, `TODO.md` |
| Code files | `lowercase.ts` (single word preferred) | `trophy.ts`, `cache.ts` |
| Code variations | `kebab-case.ts` (only when needed) | `image-cache.ts`, `sound-cache.ts` |
| Tests | `<source>.test.ts` | `cache.test.ts`, `cheer.test.ts` |
| Module barrel | `mod.ts` | Always `mod.ts` |
| CLI scripts | `lowercase.ts` | `show.ts`, `play.ts` |

## Export Conventions

- Named exports only — no default exports
- `mod.ts` re-exports public API: `export { fn, type T } from "./file.ts"`
- Types use explicit `type` keyword in re-exports

## Test Conventions

- `Deno.test("description", ...)` — plain string descriptions
- Import assertions from `@std/assert` only
- Call state-clearing function at start of stateful tests (e.g., `clear()`, `resetLevel()`)
- Network tests use `{ ignore: true, permissions: { net: true } }`
- Test data helpers use `make` prefix (e.g., `makeInput()`, `makeResult()`)

## Cache Key Convention

- Format: `"type:value"` — e.g., `"sound:hello.mp3"`, `"image:cat.png"`
- Store prefix in module constant: `CACHE_PREFIX` or `CACHE_KEY`
