# Reward Module

## Requirements

### Cheers

- Show inline feedback bubbles during gameplay after each letter input.
- React to correct and incorrect letter inputs.
- Track consecutive correct words (streak) within a round.
- Reset error count per word; reset streak per round.
- Return a message object or null (no rendering logic in this module).
- Messages are in Danish with emojis.

#### Cheer Messages

**On wrong letter (escalating per word):**

1. 1st error: `'Ups! Prøv igen 😊'` (neutral)
2. 2nd error: `'Tænk på lyden! 👂'` (helpful)
3. 3rd error: `'Du kan godt! 💪'` (encouraging)
4. 4th+ error: `'Se bogstaverne der lyser! 💡'` (tool reference)

**On correct word:**

- Without errors: `'Perfekt! ⭐'`
- With 1–2 errors: `'Godt klaret! 👍'`

**Streak milestone:**

- 5 consecutive words without errors: `'Fantastisk streak! 🔥'`
  (larger bubble, longer duration)

### Trophies

- 12 persistent achievements.
- Each trophy earned only once (first time condition is met).
- Checked after each round completion.
- Return newly unlocked trophies (empty array if none).
- Celebration screen with confetti when a trophy is unlocked (3 seconds).
- Trophy collection displayed on menu screen as a grid of cards.

#### Trophy List

| Emoji | ID | Condition |
|-------|----|-----------|
| 🌟 | `forste_bane` | Complete your first round |
| 🏆 | `stavemester` | Score ≥ 90 on a round |
| 🚀 | `lynhurtig` | Complete a round with time score ≥ 90 |
| ✨ | `fejlfri` | Complete a round with 0 errors |
| 🔥 | `pa_rekke` | Spell 10 words in a row without errors (within one round) |
| 📚 | `flittig` | Complete 5 rounds total |
| 📈 | `pa_vej_op` | Rank up for the first time |
| 🏔️ | `bjergbestiger` | Reach rank 10 |
| ⚡ | `ekspres` | Complete a round in under 3 minutes |
| 🌈 | `regnbue` | Complete rounds on 5 different difficulties |
| 🦉 | `natteravn` | Reach rank 25 |
| 👑 | `kongen_af_ord` | Reach rank 50 |

#### Trophy Display

- Unlocked: full color (emoji + title + date earned).
- Locked: grayscale with 🔒 icon and hidden title (❓).

## Design Choices

### Cheer Interface

```typescript
type CheerInput = {
  /** The word being spelled */
  word: string;
  /** Index of the letter just entered (0-based) */
  letterIndex: number;
  /** Whether the entered letter was correct */
  isCorrect: boolean;
  /** Number of wrong letters entered for this word so far */
  errorCount: number;
  /** Whether the word was just completed correctly */
  isWordComplete: boolean;
};

type Cheer = {
  /** Danish message text */
  text: string;
  /** Emoji to display */
  emoji: string;
  /** Visual style variant */
  style: "neutral" | "helpful" | "encouraging" | "reference" | "celebrated" | "milestone";
  /** Display duration in milliseconds */
  duration: number;
};
```

- **Function**: `onLetterInput(input: CheerInput): Cheer | null`
- Returns `null` when no message should be shown (e.g., correct letter mid-word).
- Internal state: `streakCount` (resets per round via `resetLevel()`), `wordErrorCount` (resets per word automatically).
- Messages are hardcoded as constants in the module.

### Trophy Interface

`RoundResult` and `PlayerStats` are defined in `src/spell/types.ts` and imported
by this module.

```typescript
type Trophy = {
  /** Unique identifier */
  id: string;
  /** Danish title */
  title: string;
  /** Emoji icon */
  emoji: string;
  /** Short description */
  description: string;
};
```

- **Function**: `checkTrophies(result: RoundResult, stats: PlayerStats, earnedIds: string[]): Trophy[]`
- Evaluates all trophy conditions, returns only newly unlocked trophies.
- Trophy definitions stored as a hardcoded array of `{ id, title, emoji, description, condition }`.
- No localStorage access — player module handles storage.
