# Sound Design

## Requirements

1. **Word pronunciation**: When a word is presented to the player, audio of the
   word spoken in correct Danish pronunciation (da-DK) must be playable.
2. **Replay**: The player must be able to replay the sound of the current word
   at any time via a replay button.
3. **Fallback**: If audio is missing or blocked, the game degrades gracefully
   (silent + "Lyd ikke tilgængelig" hint) instead of erroring.

## Design Choices

- **Source**: Audio is generated once, offline, by `deno task sound:download`
  (`src/sound/generate.ts`) and committed to the repository as static MP3
  files under `public/sounds/<word>.mp3`. There is no runtime TTS call and no
  API key — the game works fully offline for pronunciation.
- **Voice**: Microsoft Edge "Read Aloud" neural voice `da-DK-ChristelNeural`
  (female). A male voice, `da-DK-JeppeNeural`, is available via
  `deno task sound:download --voice da-DK-JeppeNeural`.
- **Generator**: The download script follows the same shape as
  `src/words/generate.ts` (download → process → store). It reads
  `public/words.json`, dedupes the words, synthesizes each via Microsoft's
  free Edge TTS WebSocket endpoint, validates the MP3, and skips existing
  files so re-runs only fill gaps.
- **Loader**: `src/sound/mod.ts` exposes `staticSoundLoader()`, a
  `MediaLoader` that fetches `/sounds/<word>.mp3` through the web server.
  `soundPath(word)` builds the URL-encoded path.
- **Caching**: No client-side audio cache is needed — the browser HTTP cache
  handles repeated fetches of the static files.

## Notes

- Microsoft's Edge TTS endpoint is unofficial and may change or break; because
  downloads are committed and idempotent, regeneration is a simple re-run.
