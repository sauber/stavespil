# StaveSpil

A Danish spelling game for kids in grades 3–6.

## Documentation

- [README.md](README.md) — Game rules, entities, domain reference
- [ARCHITECTURE.md](ARCHITECTURE.md) — Coding conventions, project structure,
  technical patterns

## Modules

Each folder in `src/` has its own `DESIGN.md` with module-specific requirements
and design choices, and an optional `TODO.md` for known issues.

| Module        | Purpose                            |
| ------------- | ---------------------------------- |
| `src/cache/`  | LRU media cache (localStorage)     |
| `src/image/`  | Image fetching (Pixabay API)       |
| `src/player/` | Player profile and rank management |
| `src/reward/` | Cheers and trophies                |
| `src/sound/`  | Word pronunciations (static MP3 files) |
| `src/spell/`  | Core game engine (rounds, scoring) |
| `src/web/`    | Web frontend (UI rendering)        |
| `src/words/`  | Word database generation           |
