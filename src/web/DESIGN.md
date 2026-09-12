# Web Module

Browser-based frontend for StaveSpil.

## Purpose

Render the game UI in the browser. This module is the only one that touches the
DOM. It receives state from the spell engine and translates it into visual
output.

The browser handles all game logic, state management, and data storage.
Vite serves the static files during development.

## Intent

Implement a full game round on `round.html`. When a player navigates to
`/round/<n>`, the page loads the spell engine with 20 words for that difficulty,
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
| SVG (hand-drawn) | Rank history line chart |

## Client-Side Data Architecture

All game data lives in the browser. Vite only serves static files — there is
no server-side game state.

### localStorage Keys

| Key                 | Module  | Contents                                              |
| ------------------- | ------- | ----------------------------------------------------- |
| `wordList`          | words   | Pre-generated word database (100 levels × 20 words)   |
| `stavespil:mediaCache` | cache | LRU cache of Base64-encoded images (~5 MB) |
| `roundHistory`      | player  | Array of round results (difficulty, score, rank, etc.) |

### Data Flow

1. On first load, `ensureWords()` downloads the word corpus from DSL, scores
   it, and stores the result in localStorage under `wordList`.
2. When a round starts, media (images) are fetched from external APIs,
   cached in localStorage, and loaded into the engine as `Uint8Array`s.
   Sounds are pre-generated static MP3 files in `public/sounds/`.
3. After each round, the player module appends to `roundHistory` and derives
   current rank, earned trophies, and stats.

### Why Browser-Only?

- No server-side database or user accounts needed.
- Works offline after initial media cache is populated.
- Single-player game — no server-side state synchronization required.
- localStorage is sufficient for the data volumes involved (word list is a
  few hundred KB, media cache tops out at ~5 MB).

## API Key Handling

The Pixabay API key is stored in the project root `.env` file and exposed to
the browser via Vite's env system. Only `VITE_`-prefixed variables are inlined
into client code by the Vite dev server at startup.

- `.env` contains `VITE_PIXABAY_API_KEY`
- The round page reads it via `import.meta.env.VITE_PIXABAY_API_KEY`
- Sound needs no key: pronunciations are pre-generated static MP3 files in
  `public/sounds/` (see `src/sound/DESIGN.md`), fetched by `staticSoundLoader`

## Pages

- `/` — menu page (`index.html`, `src/web/menu.ts`)
- `/round/N` — round page for level N (`round.html`, `src/web/round.ts`). The
  clean URL is rewritten to `/round.html?level=N` by the Vite plugin in
  `vite.config.ts`.

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

Minimalist, child-friendly style for grades 3–6 (ages 8–12).

- **Colors**: Light blue `#B8DEFF`, light green `#B8F0C8`, warm white `#FAFAF7`,
  soft pink `#FFD6E0`. Extended palette: sunny yellow `#FFE28A`, lavender
  `#D6C9FF`, peach `#FFC9A8`, mint `#A8E6CF`. No dark backgrounds.
- **Typography**: **Nunito** (rounded body text), **Fredoka** (playful headings),
  system-ui fallback for offline. Large font sizes throughout.
- **Shapes**: Large, rounded forms throughout; 1rem+ border-radius on cards.
- **Layout**: Responsive — 720px max-width menu, wider tablet primary,
  functional on mobile.

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

### Audible Key Feedback

- Each correct letter plays a quiet triangle-wave note; the letters of a word
  rise through the C-major scale (H = B), and the final letter completes the
  word with a C–E chord.
- Each wrong letter plays a short, low-volume click.
- Tones are synthesized on the fly with the Web Audio API — no assets, fully
  offline. They let children who look at the keyboard instead of the screen
  hear immediately whether a letter was accepted.

### Flow

1. One word is presented at a time.
2. Player taps letters on the on-screen keyboard.
3. Correct letters fill the next frame in order.
4. After all frames are filled correctly, the next word loads automatically.

## Menu Screen

### Rank Display

- Current (most recent) rank shown prominently as a colorful badge whose color
  and emoji change per rank tier (e.g. 🌱 1–9, ⭐ 10–24, 👑 100).
- Line chart of rank history over time (hand-drawn SVG).
- Friendly call-to-action button to play the current level.

### Level Selection

- Scrollable list of all 100 difficulty levels.
- Each level shows an example word on a pastel-colored bubble.
- The current level is highlighted with a "Du er her" star tag; played levels
  show a small checkmark.
- Player taps a level to start the round.

### Trophy Collection

- Grid of trophy cards displayed below the level list, with an earned counter
  chip (e.g. "4 af 15").
- Unlocked trophies: full color emoji + title + date earned.
- Locked trophies: grayscale with a lock icon, hidden title.



## Game Rules

- Target audience: kids in grades 3–6.
- Encouraging and motivating messages when spelling goes poorly (cheers from the
  reward module).
- Fun trophies awarded when spelling goes well (trophies from the reward module).
