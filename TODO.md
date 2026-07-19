Documentation Holes Found

1. src/sound/mod.ts missing — No barrel file. AGENTS.md says every dir should
   have mod.ts.
2. src/words/mod.ts missing — Same issue.
3. src/web/ not implemented — DESIGN.md exists but no code.
4. src/player/ not implemented — DESIGN.md exists but no code.
5. src/sound/DESIGN.md mentions fallback TTS — window.speechSynthesis fallback
   not implemented.
6. src/image/DESIGN.md mentions placeholder on failure — Not implemented.
7. No src/spell/TODO.md — The getWords() method was added but not documented in
   DESIGN.md as a design choice.
8. Circular dependency pattern — Not documented anywhere as a project convention
   (will be in ARCHITECTURE.md).
