# Media Cache

## Requirements

- Store picture files in a LRU cache.
- Export method to confirm if media file is in cache, store in cache or retrieve
  from cache.
- Keep cache usage below 80%.

## Design Choices

- **Storage**: Use `localStorage` (web standard).
- **Media types**: Pictures (Pixabay images fetched at runtime). Sound is no
  longer cached — pronunciations are pre-generated static files served from
  `public/sounds/` (see `src/sound/DESIGN.md`).
- **Size limit**: ~5 MB (80% threshold = ~4 MB).
- **Cache keys**: Type-prefixed (`image:cat.png`).
- **Eviction**: LRU when at 80% capacity.
- **Cache miss**: Return `null`, caller handles fetch.
- **Data format**: Base64 data URLs.
- **Public API**: `has`, `get`, `set`, `clear`, `size`, `keys`, `remove`.
