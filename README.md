# StaveSpil

A Danish spelling game for kids in grades 3–6. Players spell Danish words using
an interactive letter keyboard, guided by sound and images.

## Purpose

Help children learn to spell Danish words through an engaging, game-based
experience. The game adapts to each player's skill level and rewards progress
with cheers and trophies.

## Roles

There are no profiles, no login, no admin, and no parent roles. Player progress
and game data are stored in the browser's localStorage.

## Flow

1. **Startup** — Ensure the word database is generated.
2. **Menu** — Show current rank, rank history graph, level selection, and trophy
   collection.
3. **Round** — Player spells the words on the chosen level.
4. **Progress** — After the round, the player's new rank is calculated and added
   to their history.

## Game Rules

### Round Structure

- A round consists of **20 words**.
- The player must spell all words correctly to complete the round.
- When a word is spelled correctly, the game advances to the next word.
- After the 20th word, calling `nextWord()` marks the round as complete.

### Word Selection

Words are drawn from three difficulty levels:

- **10 words** from the chosen level
- **5 words** from the level below (clamped to 1)
- **5 words** from the level above (clamped to 100)

All 20 words are shuffled randomly before the round begins.

### Spelling

- The player is presented with a word along with its pronunciation and an image
  representing the word.
- The player spells the word by tapping letters on an on-screen keyboard.
- Letters must be entered in the correct order.
- The current letter position is visible to the player.

### Scoring

Each round produces a combined performance score (0–100):

- **Error rate** (60% weight) — Based on total errors across all words
- **Time** (40% weight) — Based on total time spent on the round

The score determines whether the player's rank goes up, stays the same, or
decreases. Detailed scoring formulas are in `src/spell/DESIGN.md`.

### Streak

- A streak counts consecutive words spelled correctly without any errors.
- The streak resets to zero when an error occurs on any letter.
- A streak milestone is celebrated at 5 consecutive correct words.

## Feedback

### Cheers

Inline feedback bubbles appear during gameplay after each letter input.

**On wrong letter** (escalating per word):

1. 1st error: Neutral tone
2. 2nd error: Helpful hint
3. 3rd error: Encouragement
4. 4th+ error: Points to visual aids

**On correct word:**

- Without errors: Celebration message
- With 1–2 errors: Positive reinforcement

**Streak milestone:**

- 5 consecutive words without errors: Special celebration (larger bubble, longer
  duration)

### Trophies

Persistent achievements earned once when a condition is met. Checked after each
round completion. Newly unlocked trophies trigger a celebration screen with
confetti for 3 seconds.

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

**Display**: Unlocked trophies show in full color (emoji + title + date earned).
Locked trophies appear in grayscale with a lock icon and hidden title.

## Word Database

- Source: DSL corpus (`ordbanken/da/`) — the most frequent Danish words.
- Words are distributed into **100 difficulty levels** with equal word counts.
- Difficulty is scored based on:
  - Word length (30%)
  - Frequency in language (25%)
  - Number of syllables (20%)
  - Consonant ratio (25%)

## Menu Screen

- Show the player's current (most recent) rank and a rank history graph.
- Show all levels with example words from each level.
- Allow the player to select a level. The round starts when a level is chosen.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for coding conventions, project
structure, and technical patterns.
