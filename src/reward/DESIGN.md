# Reward Module

## Requirements

### Cheers

- Show inline feedback bubbles during gameplay after each letter input.
- React to correct and incorrect letter inputs.
- Track consecutive correct words (streak) within a level.
- Reset error count per word; reset streak per level.
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
- Stored in localStorage.
- Checked after each level completion.
- Return newly unlocked trophies (empty array if none).
- Celebration screen with confetti when a trophy is unlocked (3 seconds).
- Trophy collection displayed on menu screen as a grid of cards.

#### Trophy List

| Emoji | ID | Condition |
|-------|----|-----------|
| 🌟 | `Første bane` | Complete your first level |
| 🏆 | `Stavemester` | Score ≥ 90 on a level |
| 🚀 | `Lynhurtig` | Complete a level with time score ≥ 90 |
| ✨ | `Fejlfri` | Complete a level with 0 errors |
| 🔥 | `På række` | Spell 10 words in a row without errors (within one level) |
| 📚 | `Flittig` | Complete 5 levels total |
| 📈 | `På vej op` | Level up for the first time |
| 🏔️ | `Bjergbestiger` | Reach level 10 |
| ⚡ | `Ekspres` | Complete a level in under 3 minutes |
| 🌈 | `Regnbue` | Complete levels on 5 different level numbers |
| 🦉 | `Natteravn` | Reach level 25 |
| 👑 | `Kongen af ord` | Reach level 50 |

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
- Internal state: `streakCount` (resets per level via `resetLevel()`), `wordErrorCount` (resets per word automatically).
- Messages are hardcoded as constants in the module.

### Trophy Interface

```typescript
type LevelResult = {
  /** Combined score (0–100) */
  score: number;
  /** Total errors across all words */
  errors: number;
  /** Time score (0–100) */
  timeScore: number;
  /** Total time in seconds */
  totalTime: number;
  /** Level number played */
  levelNumber: number;
  /** Whether player leveled up */
  isLevelUp: boolean;
  /** Longest streak of consecutive correct words in this level */
  maxStreak: number;
};

type PlayerStats = {
  /** Total number of levels completed */
  totalGames: number;
  /** Set of distinct level numbers played */
  levelsSeen: number[];
  /** Current player level */
  currentLevel: number;
};

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

- **Function**: `checkTrophies(levelResult: LevelResult, playerStats: PlayerStats): Trophy[]`
- Reads existing trophies from localStorage, checks conditions, saves new ones, returns only newly unlocked.
- Trophy definitions stored as a hardcoded array of `{ id, title, emoji, description, condition }`.

### Storage

- **Key**: `trophies`
- **Format**: `Array<{ id: string, unlockedAt: number }>`
- **Library**: `localStorage` (web standard)
