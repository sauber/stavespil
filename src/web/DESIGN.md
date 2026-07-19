# Web Module

Browser-based frontend for StaveSpil.

## Purpose

Render the game UI in the browser. This module is the only one that touches the
DOM. It receives state from the spell engine and translates it into visual
output.

## Tech Stack

| Tool | Purpose |
|------|---------|
| Deno | Runtime |
| Hono | HTTP server and routing |
| Tailwind CSS | Utility-first styling |
| recharts | Rank history line chart |
| framer-motion | UI animations |
| canvas-confetti | Trophy unlock celebration |

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

## Game Rules

- Target audience: kids in grades 3–6.
- Encouraging and motivating messages when spelling goes poorly (cheers from the
  reward module).
- Fun trophies awarded when spelling goes well (trophies from the reward module).
