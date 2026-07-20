# Web Module

Browser-based frontend for StaveSpil.

## Purpose

Render the game UI in the browser. This module is the only one that touches the
DOM. It receives state from the spell engine and translates it into visual
output.

The browser handles all game logic, state management, and data storage.
Vite serves the static files during development.

## Intent

Implement a full game round on `level.html`. When a player navigates to
`/level/<n>`, the page loads the spell engine with 20 words for that difficulty,
displays each word via image and sound, accepts letter input from both the
on-screen keyboard and physical keyboard, cycles through all words, and on
completion saves the round result (score, rank change, trophies) to the player
profile in localStorage. The results screen shows score, errors, time, rank
change, and any newly unlocked trophies.

## Tech Stack

| Tool | Purpose |
|------|---------|
| Vite | Dev server and bundler (serves native ES modules) |
| Deno | Runtime (runs Vite, manages deps) |
| Tailwind CSS | Utility-first styling (v4, CSS-first config) |
| Chart.js | Rank history line chart |

## Client-Side Data Architecture

All game data lives in the browser. Vite only serves static files — there is
no server-side game state.

### localStorage Keys

| Key                 | Module  | Contents                                              |
| ------------------- | ------- | ----------------------------------------------------- |
| `wordList`          | words   | Pre-generated word database (100 levels × 20 words)   |
| `stavespil:mediaCache` | cache | LRU cache of Base64-encoded images and sounds (~5 MB) |
| `roundHistory`      | player  | Array of round results (difficulty, score, rank, etc.) |

### Data Flow

1. On first load, `ensureWords()` downloads the word corpus from DSL, scores
   it, and stores the result in localStorage under `wordList`.
2. When a round starts, media (images, sounds) are fetched from external APIs,
   cached in localStorage, and loaded into the engine as `Uint8Array`s.
3. After each round, the player module appends to `roundHistory` and derives
   current rank, earned trophies, and stats.

### Why Browser-Only?

- No server-side database or user accounts needed.
- Works offline after initial media cache is populated.
- Single-player game — no server-side state synchronization required.
- localStorage is sufficient for the data volumes involved (word list is a
  few hundred KB, media cache tops out at ~5 MB).

## API Key Handling

API keys for Pixabay and VoiceRSS are embedded directly in the client code
(`app.ts`). Both APIs have free tiers with generous limits — no proxy server
is needed.

## Shared Types

Shared types used across modules live in `src/gameState/mod.ts`:

- `CheerInput` — input for the cheer function on each letter keypress
- `Cheer` — a cheer message with text, emoji, style, and duration
- `RoundResult` — result of a completed round (score, errors, time, rank change)
- `PlayerStats` — cumulative player statistics (total rounds, difficulties, rank)
- `EngineState` — complete state snapshot pushed to renderer on every change

The spell module re-exports these from `src/spell/types.ts` for convenience.
The web module should import from `src/gameState/mod.ts` directly.

## Visual Design

Minimalist, child-friendly style for ages 3–6 (grades 3–6).

- **Colors**: Light blue `#B8DEFF`, light green `#B8F0C8`, warm white `#FAFAF7`,
  soft pink accents `#FFD6E0`. No dark backgrounds.
- **Typography**: Clear sans-serif, large font sizes.
- **Shapes**: Large, rounded forms throughout.
- **Layout**: Responsive — primarily tablet, but functional on desktop.

## Game Screen

### Word Presentation

- The word to spell is chosen by the game but **never displayed as text**.
- An image representing the word is shown.
- A sound clip plays automatically on word load. The player can replay it.
- Empty letter frames appear (count equals word length).

### Keyboard

- Grid of round buttons representing the Danish alphabet (a–z plus æ, ø, å).
- All letters start active.
- On each wrong letter, half of the active letters that are **not** in the word
  are dimmed (set to low opacity).
- After 4 errors, only letters that appear in the word remain active. These
  cannot be dimmed further.
- Inactive letters are visually muted (reduced opacity).

### Letter Frames

- Large square or rounded-square fields with clear borders.
- Correct letters fill frames in sequence with a "fall into place" animation.
- Wrong letters trigger a subtle shake animation.

### Flow

1. One word is presented at a time.
2. Player taps letters on the on-screen keyboard.
3. Correct letters fill the next frame in order.
4. After all frames are filled correctly, the next word loads automatically.

## Menu Screen

### Rank Display

- Current (most recent) rank shown prominently.
- Line chart of rank history over time (recharts).

### Level Selection

- Scrollable list of all 100 difficulty levels.
- Each level shows an example word.
- Player taps a level to start the round.

### Trophy Collection

- Grid of trophy cards displayed below the level list.
- Unlocked trophies: full color emoji + title + date earned.
- Locked trophies: grayscale with a lock icon, hidden title.

## Level Screen

Entry point for a single game round. Each difficulty level has its own URL.

### Routing

| Route | Description |
|-------|-------------|
| `/level/1` | Difficulty level 1 |
| `/level/100` | Difficulty level 100 |

The difficulty number is extracted from the URL path. A Vite dev server
middleware rewrites `/level/<number>` requests to serve `level.html`.

### Files

| File | Purpose |
|------|---------|
| `level.html` | HTML entry point (root, alongside `index.html`) |
| `src/web/level.ts` | Reads the difficulty from the URL path and sets the page title |

### Behavior

- Parses `window.location.pathname` to extract the difficulty number.
- Sets `document.title` to `"Level <difficulty>"`.
- Loads the spell engine with 20 words for the difficulty level.
- Pre-fetches images (Pixabay) and sounds (VoiceRSS) for all words.
- Renders the game screen: image, sound replay button, letter frames, on-screen
  keyboard, progress indicator, and cheer messages.
- Accepts letter input via physical keyboard (`keydown`) and on-screen keyboard
  (click/tap).
- Cycles through words automatically after each word is completed.
- On round completion, computes score, checks trophies, saves result to
  localStorage, and displays the results screen.

## Game Rules

- Target audience: kids in grades 3–6.
- Encouraging and motivating messages when spelling goes poorly (cheers from the
  reward module).
- Fun trophies awarded when spelling goes well (trophies from the reward module).
