# Picture

## Requirements

- Each word is represented by one illustration image.
- Images are identified by Danish words.
- Images are clipart/illustration style, not photos.
- All images needed for a level (20 words) must be loaded before the level
  starts.
- Show "Billeder fra Pixabay" attribution in the UI.
- Image storage must not exceed cache limits.

## Design Choices

- **Source**: Pixabay API with `image_type=illustration`, `lang=da`.
  - API key required (free).
  - Use `previewURL` (150px wide JPEG) for small size.
  - Optionally add `colors=transparent` for transparent backgrounds.
  - Rate limit: 100 requests/60 seconds.
- **Caching**:
  - Store images as Base64 data URLs via shared cache (`src/cache`).
  - Cache key: `image:<danish-word>`.
  - Cache limit: ~5 MB (80% threshold = ~4 MB) with LRU eviction.
  - 24-hour minimum cache per Pixabay terms.
- **Fetch strategy**:
  - Before level start: for each of 20 words, check cache → if miss, fetch from
    Pixabay → convert to Base64 → store in cache.
  - Level starts only when all 20 images are loaded.
- **Retry cascade**: When the initial query returns zero results, progressively
  relax search filters before giving up:
  1. `image_type=illustration` + `lang=da` (full filter)
  2. `lang=da` only (any image type)
  3. No filters (just `q=word`)
- **Placeholder fallback**: If all search steps return zero results, generate an
  SVG placeholder image showing a row of colored dots — one per letter. Red dots
  for vowels (`aeiouyæøå`), blue dots for consonants. The placeholder is cached
  like any other image so subsequent rounds do not re-trigger API queries.
- **Verbose mode**: Image downloader supports an optional verbose mode that
  prints number of images found, first image URL, byte size, and cache key.
- **Attribution**: Display "Billeder fra Pixabay" in the game UI.
