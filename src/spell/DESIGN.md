# Spell Module — Requirements and Design

## Purpose

The spell module is the core game engine. It orchestrates one round (bane) of
spelling: selecting words, preparing media, accepting letter input, providing
feedback, tracking time, and computing a score with rank change.

The engine is **environment-agnostic** — it does not know whether it runs in a
web browser, a CLI terminal, or a scripted test. All external interactions
(media loading, state rendering) are injected as dependencies.

## Requirements

### R1 — Word Selection

A round consists of exactly 20 words drawn from the word database.

- 50% (10 words) from the chosen difficulty level
- 25% (5 words) from the level below
- 25% (5 words) from the level above
- Levels are clamped to 1–100: if difficulty is 1, "below" is also level 1; if
  difficulty is 100, "above" is also level 100.
- Words are shuffled randomly after selection.

### R2 — Media Preparation

Before the round starts, media (image + sound) must be fetched for all 20 words.

- Media loading is performed via injected `MediaLoader` functions.
- The engine receives pre-loaded `Uint8Array` data for each word.
- Media is fetched in parallel for all 20 words.
- The engine does not know about API keys, caching, or network protocols.

### R3 — Word Presentation

One word is presented at a time, in sequence.

- An image representing the word is available (as `Uint8Array`).
- A sound clip of the word's pronunciation is available (as `Uint8Array`).
- Empty letter frames are shown (count = word length).
- The word is **never** displayed as text.
- Sound replays on demand (renderer handles this from state).

### R4 — Letter Input

The player types letters via an on-screen keyboard (Danish alphabet: a–z plus
æ, ø, å).

- Letters are validated case-insensitively.
- Correct letters fill the next empty frame in sequence.
- Wrong letters increment the error counter for the current word.
- Errors are tracked per-word and cumulatively across the round.

### R5 — Feedback (Cheers)

On each letter input, the engine evaluates whether a cheer message should be
shown.

- The engine delegates to the reward module's `onLetterInput()` function.
- Cheer messages are included in the state snapshot pushed to the renderer.
- Streak tracking spans the entire round (consecutive error-free words).
- `resetLevel()` is called by the engine at round start.

### R6 — Word Completion

When all frames are filled correctly, the word is complete.

- The engine records the word result: word text, error count, start time, end
  time.
- The engine sets `isWordComplete: true` in the state snapshot.
- The renderer is responsible for displaying the cheer and advancing to the next
  word (via `nextWord()`).

### R7 — Round Completion

After the 20th word is completed, the round ends.

- The engine sets `isComplete: true` in the state snapshot.
- The round factory computes the final score and rank change.

### R8 — Score Calculation

The score is computed from error rate and time, weighted 60/40.

**Error score (0–100):**

| Errors | Score |
|--------|-------|
| 0      | 100   |
| 1      | 80    |
| 2      | 60    |
| 3      | 40    |
| ≥4     | 20    |

Linear interpolation between breakpoints.

**Time score (0–100):**

- Expected time per letter = 2 seconds × difficulty multiplier.
- Difficulty multiplier: linear map from difficulty 1–100 to 1.0–3.0.
- Per-word time score = min(150, (expected / actual) × 100).
- Final time score = average over all 20 words, normalized to 0–100.

**Combined score:**

```
combined = (errorScore × 0.6) + (timeScore × 0.4)
```

### R9 — Rank Change

| Score  | Change |
|--------|--------|
| ≥ 75   | +1     |
| 40–74  | 0      |
| < 40   | −1     |

### R10 — State Communication

The engine communicates state changes via a callback function.

- `onStateChange(state)` is called after every `enterLetter()` and `nextWord()`
  invocation.
- The state snapshot contains everything the renderer needs: current word index,
  frames, image, sound, cheer, completion flags, errors, word letters.

### R11 — Environment Agnosticism

The engine must not depend on:

- DOM, `window`, `document`, or browser APIs
- `localStorage` or any storage mechanism
- Network (`fetch`, `XMLHttpRequest`)
- File system access
- Any rendering mechanism

All external interactions are injected:

- Media data: received as `Uint8Array` via `MediaLoader` functions
- State rendering: via `onStateChange` callback
- Time: via `Date.now()` (mockable in tests)

## Design

### File Structure

```
src/spell/
├── types.ts         — Shared types (RoundResult, WordResult, ScoreResult)
├── score.ts         — Pure score calculation functions
├── engine.ts        — Game state machine
├── round.ts         — Round orchestration (word selection, media, lifecycle)
├── mod.ts           — Public API re-exports
├── score.test.ts    — Score tests
├── engine.test.ts   — Engine tests
├── round.test.ts    — Round tests
└── DESIGN.md        — This file
```

### Types (`types.ts`)

All shared types are defined in `types.ts`:

- `WordResult` — result of a single word (word, errors, timing)
- `ScoreResult` — score breakdown (errorScore, timeScore, combinedScore, rankChange, totalTime)
- `RoundResult` — extends `ScoreResult` with difficulty and maxStreak
- `Media` — image and sound as `Uint8Array`
- `OnStateChange` — callback signature for state updates
- `MediaLoader` — function that loads media for a word
- `PlayerStats` — player statistics for trophy checking (imported by reward module)

### Engine State (`engine.ts`)

```typescript
/** Complete state snapshot pushed to renderer on every change. */
type EngineState = {
  wordIndex: number;           // 0–19
  totalWords: number;          // 20
  frames: (string | null)[];  // filled letter positions, null = unfilled
  image: Uint8Array;           // current word's image
  sound: Uint8Array;           // current word's sound
  cheer: Cheer | null;         // feedback message (from reward module)
  isWordComplete: boolean;     // true when current word just completed
  isComplete: boolean;         // true when all 20 words done
  wordErrors: number;          // errors on current word
  totalErrors: number;         // cumulative errors across round
  wordLetters: string[];       // unique letters in current word (for keyboard)
};
```

### Engine API (`engine.ts`)

```typescript
function createEngine(
  words: string[],
  media: Media[],
  onStateChange: OnStateChange,
): Engine;

type Engine = {
  /** Validate a letter input. Updates state and calls onStateChange. */
  enterLetter(letter: string): void;

  /** Advance to next word. Called by renderer after word-complete cheer. */
  nextWord(): void;

  /** Get completed word results (for score calculation). */
  getWordResults(): WordResult[];
};
```

**`enterLetter(letter)` algorithm:**

1. Get current word: `words[currentWordIndex]`
2. Compute next expected position: `frames.filter(f => f !== null).length`
3. Compare `letter.toLowerCase()` to `word[position].toLowerCase()`
4. If correct:
   - Set `frames[position] = letter`
   - Call `onLetterInput()` from reward module with `isCorrect: true`
5. If wrong:
   - Increment `wordErrors` and `totalErrors`
   - Call `onLetterInput()` from reward module with `isCorrect: false`
6. If word complete (all frames filled):
   - Set `endTime = Date.now()`
   - Record `WordResult`
   - Set `isWordComplete = true`
   - Get cheer from `onLetterInput()` with `isWordComplete: true`
7. Call `onStateChange(state)`

**`nextWord()` algorithm:**

1. If `currentWordIndex < 19`:
   - Increment `currentWordIndex`
   - Reset: `frames = new Array(words[index].length).fill(null)`
   - Reset: `wordErrors = 0`, `isWordComplete = false`
   - Set: `startTime = Date.now()`
2. If `currentWordIndex === 19` (already on last word):
   - Set `isComplete = true`
3. Call `onStateChange(state)`

### Round Factory (`round.ts`)

```typescript
type RoundConfig = {
  difficulty: number;          // 1–100
  imageLoader: MediaLoader;
  soundLoader: MediaLoader;
  onStateChange: OnStateChange;
};

type Round = {
  enterLetter(letter: string): void;
  nextWord(): void;
  isComplete(): boolean;
  getResult(): RoundResult;
};

async function createRound(config: RoundConfig): Promise<Round>;
```

**`createRound` algorithm:**

1. Load word groups via `retrieveWords()` from `src/words/`
2. Select 20 words:
   - `difficulty - 1` (clamped 0–99): pick 5 words
   - `difficulty` (clamped 0–99): pick 10 words
   - `difficulty + 1` (clamped 0–99): pick 5 words
   - Use index-based selection: pick words at random positions within each group
3. Shuffle the 20 words (Fisher-Yates)
4. Fetch media for all 20 words in parallel:
   ```
   Promise.all(words.map(w => Promise.all([imageLoader(w), soundLoader(w)])))
   ```
5. Create engine: `createEngine(words, media, onStateChange)`
6. Call `resetLevel()` from reward module
7. Return `Round` object that delegates to engine

**`getResult()` algorithm:**

1. Get `wordResults` from engine
2. Calculate `errorScore` via `calculateErrorScore(totalErrors)`
3. Calculate `timeScore` via `calculateTimeScore(wordResults, difficulty)`
4. Calculate `combinedScore` via `calculateCombinedScore(errorScore, timeScore)`
5. Calculate `rankChange` via `calculateRankChange(combinedScore)`
6. Calculate `totalTime` via `calculateTotalTime(wordResults)`
7. Calculate `maxStreak` from word results
8. Return `RoundResult`

### Score Functions (`score.ts`)

Pure functions with no side effects.

```typescript
function calculateErrorScore(totalErrors: number): number;
function calculateTimeScore(wordResults: WordResult[], difficulty: number): number;
function calculateCombinedScore(errorScore: number, timeScore: number): number;
function calculateRankChange(score: number): -1 | 0 | 1;
function calculateTotalTime(wordResults: WordResult[]): number;
```

### External Dependencies

| Dependency | Used By | How |
|------------|---------|-----|
| `src/reward/mod.ts` | `engine.ts` | `onLetterInput()` for cheer messages, `resetLevel()` at round start |
| `src/words/mod.ts` | `round.ts` | `retrieveWords()` to load word groups |
| `src/image/mod.ts` | caller | Provides `imageLoader` via config |
| `src/sound/mod.ts` | caller | Provides `soundLoader` via config |

### Test Strategy

**`score.test.ts`**: Pure function tests.

- Error score: 0, 1, 2, 3, 4+ errors, interpolation between breakpoints
- Time score: fast/slow words, difficulty multiplier, edge cases
- Combined score: weighted average verification
- Rank change: boundary values (39, 40, 74, 75)
- Total time: sum calculation

**`engine.test.ts`**: State machine tests with mocked dependencies.

- Mock `onStateChange` to capture state snapshots
- Mock `onLetterInput` to return controlled cheer values
- Test correct letter fills frame
- Test wrong letter increments errors
- Test word completion records result
- Test round completion
- Test `nextWord()` advances correctly
- Test `getWordResults()` returns all word results
- Test streak tracking across words

**`round.test.ts`**: Integration tests with mocked external deps.

- Mock word groups (provide fixed word list)
- Mock media loaders (return dummy `Uint8Array`)
- Mock `onStateChange`
- Test word selection ratios (10/5/5)
- Test boundary clamping (difficulty=1, difficulty=100)
- Test media pre-fetching (all 20 words)
- Test round lifecycle (create → letters → completion → result)
- Test score calculation integration
