# Sound Design

## Requirements

1. **Word pronunciation**: When a word is presented to the player, audio of the
   word spoken in correct Danish pronunciation (da-DK) must be playable.
2. **Replay**: The player must be able to replay the sound of the current word
   at any time via a replay button.
3. **Fallback**: If the primary TTS service is unavailable, a browser-native
   fallback should be used.

## Design Choices

- **Primary TTS**: VoiceRSS API with `hl=da-dk` locale. API key is stored in
  `.env` and loaded at runtime. URL format:
  `http://api.voicerss.org/?key={API_KEY}&hl=da-dk&src={WORD}&c=MP3`
- **Fallback TTS**: `window.speechSynthesis` with `lang: "da-DK"`.
- **Caching**: Audio responses are cached via the shared media cache
  (`src/cache/mod.ts`). Cache keys are type-prefixed (e.g., `sound:kat`).
  Data is stored as base64 data URLs. Eviction is LRU based on total
  estimated byte size (5 MB limit, 80% threshold).
