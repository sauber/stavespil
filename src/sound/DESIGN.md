LYD — primær: VoiceRSS API (da-DK, gratis op til 350 req/dag). URL:
http://api.voicerss.org/?key=APIKEY&hl=da-dk&src=WORD&c=MP3. Caches som base64 i
localStorage. Fallback: window.speechSynthesis (da-DK).

mediaCache: {lru: [word, ...], entries: {word: {audioBase64, imageUrl,
lastUsed}}}

Lyd og billeder caches i localStorage med LRU-strategi (max ~200 entries).
