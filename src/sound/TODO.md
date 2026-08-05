- Re-run `deno task sound:download` after `public/words.json` changes to keep
  `public/sounds/` in sync (the script only fills gaps; stale files for removed
  words are not cleaned up automatically).
