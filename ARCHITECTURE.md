# Architecture

Technical foundations, coding conventions, and project structure for StaveSpil.

## Runtime and Language

- **Runtime**: Deno
- **Language**: TypeScript
- **Module system**: ES modules (`.ts` files)
- **Packages**: JSR modules only — never npm modules
- **Testing**: `jsr:@std/assert` for assertions

## Project Structure

```
src/
├── cache/      — LRU media cache (localStorage)
├── gameState/  — Shared types used across modules
├── image/      — Image fetching (Pixabay API)
├── player/     — Player profile and rank management
├── reward/     — Cheers (inline feedback) and trophies (achievements)
├── sound/      — Sound fetching (VoiceRSS TTS)
├── spell/      — Core game engine (round orchestration, scoring)
├── web/        — Web frontend (UI rendering)
└── words/      — Word database generation and storage
```

Each module follows the same structure:

```
src/<module>/
├── mod.ts          — Public API barrel (re-exports)
├── <name>.ts       — Implementation
├── <name>.test.ts  — Co-located tests
├── DESIGN.md       — Requirements and design for this module only
└── TODO.md         — Known issues (optional)
```

## Code Conventions

### Naming

| Kind             | Convention       | Examples                                    |
| ---------------- | ---------------- | ------------------------------------------- |
| Functions        | camelCase        | `getWordPicture`, `onLetterInput`           |
| Variables        | camelCase        | `streakCount`, `cacheKey`                   |
| Constants        | UPPER_SNAKE_CASE | `CACHE_KEY`, `STREAK_THRESHOLD`             |
| Types/Interfaces | PascalCase       | `CheerInput`, `RoundResult`, `WordEntry`    |

### File Naming

| Kind | Convention | Examples |
| ---- | ---------- | -------- |
| Markdown docs | UPPERCASE.md | `DESIGN.md`, `TODO.md`, `ARCHITECTURE.md` |
| Code files | `lowercase.ts` (single word preferred) | `trophy.ts`, `cache.ts` |
| Code variations | `kebab-case.ts` (only when needed) | `image-cache.ts`, `sound-cache.ts` |
| Tests | `<source>.test.ts` | `cache.test.ts`, `cheer.test.ts` |
| Module barrel | `mod.ts` | Always `mod.ts` |
| CLI scripts | `lowercase.ts` | `show.ts`, `play.ts` |

### Exports

- Named exports only — no default exports
- `mod.ts` re-exports public API: `export { fn, type T } from "./file.ts"`
- Types use explicit `type` keyword in re-exports

### Documentation

- All public symbols documented using JSDoc
- Keep requirements and design choices separated in each module's `DESIGN.md`

## Testing Conventions

- `Deno.test("description", ...)` — plain string descriptions
- Import assertions from `@std/assert` only
- Call state-clearing function at start of stateful tests (e.g., `clear()`, `resetLevel()`)
- Network tests use `{ ignore: true, permissions: { net: true } }`
- Test data helpers use `make` prefix (e.g., `makeInput()`, `makeResult()`)

## Quality Checks

After every change, confirm code quality with:

```bash
deno check src/**/*.ts
deno lint src/
deno test src/
```

## Cache Key Convention

- Format: `"type:value"` — e.g., `"sound:hello.mp3"`, `"image:cat.png"`
- Store prefix in module constant: `CACHE_PREFIX` or `CACHE_KEY`

## Cross-Cutting Patterns

### Dependency Injection

Modules that interact with external systems (network, storage, rendering) receive
dependencies as function parameters rather than importing them directly. This
enables testing without mocks and keeps the engine environment-agnostic.

Example: The spell engine receives `MediaLoader` functions and an
`onStateChange` callback rather than importing fetch or DOM APIs.
