# Player Module

Manage player rank, round history, and trophy tracking.

## Requirements

- Single user profile, no login, stored in localStorage.
- Player rank is an integer 1–100.
- Rank is derived from the last entry in round history (no separate storage).
- Rank changes by at most ±1 after each completed round.
- Player can freely choose any difficulty; game recommends current rank.
- Playing a lower difficulty than rank → rank cannot increase.
- Playing a higher difficulty than rank → rank cannot decrease.
- First play: player rank equals chosen difficulty.
- Round history tracks: difficulty played, result R, new rank, errors,
  completion time, trophies unlocked, and timestamp.
- Trophies are stored as IDs within each round history entry (no separate trophy
  storage).
- Reward module handles only trophy unlock logic (no storage access).

## Design Choices

### localStorage Schema

```
roundHistory: Array<{
  difficulty: number,
  result: number,
  newRank: number,
  errors: number,
  totalTime: number,
  trophiesUnlocked: string[],
  timestamp: number
}>
```

### Derived Data

All player state is derived from `roundHistory`:

- `currentRank` = last entry's `newRank` (or 1 if no history)
- `earnedTrophyIds` = all unique IDs from `trophiesUnlocked` across entries
- `PlayerStats` = computed from history for trophy checking

### Rank Calculation

Given:

- S = current rank
- B = difficulty of completed round
- R = result of completed round (-1, 0, or +1)
- T = new rank

Rules:

- T = S - 1 when S == B and R == -1
- T = S - 1 when B < S and R <= 0
- T = S + 1 when S == B and R == +1
- T = S + 1 when B > S and R >= 0
- T = S in all other cases

### Interfaces

```typescript
type RoundHistoryEntry = {
  difficulty: number;
  result: number;
  newRank: number;
  errors: number;
  totalTime: number;
  trophiesUnlocked: string[];
  timestamp: number;
};

type PlayerProfile = {
  roundHistory: RoundHistoryEntry[];
};
```

`PlayerStats` is defined in `src/spell/types.ts` and imported by this module.

### Functions

- `calculateNewRank(currentRank, difficulty, result)` →
  `{ newRank, historyEntry }`
- `loadProfile()` → `PlayerProfile`
- `saveProfile(profile)` → `void`
- `clearProfile()` → `void` (for testing)
- `getEarnedTrophyIds(profile)` → `string[]`
- `buildPlayerStats(profile)` → `PlayerStats`
