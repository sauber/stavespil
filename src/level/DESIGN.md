Således afspilles en bane.

Banen består af 20 ord, 50% ord fra det valgte niveau, 25% fra niveauet under og
25% ord fra niveauet over.

BANESTART — Mediecaching: Spillet sammensætter 20 ord — 10 fra valgt niveau, 5
fra niveauet under, 5 fra niveauet over — i tilfældig rækkefølge. For hvert ord
hentes: (1) Lyd via VoiceRSS API (da-DK, gratis op til 350 req/dag) med Web
Speech API (da-DK) som fallback. (2) Billede via Pixabay API (gratis API-nøgle).
Lyd og billeder caches i localStorage med LRU-strategi (max ~200 entries).

SPILFLOW: Ét ord ad gangen præsenteres. Billede vises, lyd afspilles automatisk
og kan genafspilles. Tomme bogstavrammer (antal = ordets længde) vises.
Spilleren trykker bogstaver på on-screen tastatur (dansk alfabet inkl. æ, ø, å).
Korrekte bogstaver udfylder rammer i rækkefølge med animation. Ved forkert
bogstav halveres aktive bogstaver. Efter 4 fejl er kun ordets bogstaver aktive.
Ordet vises aldrig som tekst. Næste ord starter automatisk ved korrekt stavning.

NIVEAUBEREGNING EFTER BANE:

PRÆSTATIONSSCORE (0–100):

FEJLRATE: Totale fejl / 20 ord. 0 fejl/ord = 100p, 1 = 80p, 2 = 60p, 3 = 40p, ≥4
= 20p. Lineær interpolation.

TIDSSCORE: Forventet tid/ord = 5s × (sværhedsværdi 1.0–3.0). Faktisk tid fra 1.
bogstav til korrekt stavning. Tidsscore/ord = min(150, forventet/faktisk × 100).
Gennemsnit over 20 ord.

SAMLET = (fejlrate × 0.6) + (tidsscore × 0.4).

NIVEÆNDRING: Score ≥75 → +1. Score 40–74 → uændret. Score <40 → −1. Niveau:
1–100. Første gang = valgt baneniveau.

## Spiller niveau

- Når alle ord er stavet, så er banen færdig, og spillerens niveau udregnes og
  tilføjes til spillerens historik.
- Niveauet er baseret på
  - Sværhedsgraden af ordene
  - Antal stavningsfejl
  - Gennemførelsestid af banen
- Det udregnede niveau kan være samme som niveauet da banen begyndte, eller 1
  højere eller 1 lavere.
- Spillerens niveau skal relatere til banens niveau. For eksempel, hvis
  spilleres niveau er 10 når banen starter, og bane niveau 10 vælges, og
  spilleres klares sig ca. gennemsnitlig med stavning, så forbliver spilleres på
  niveau 10.
- Seneste niveau og historik med niveau gemmes i localStorage.
- Allerførste gang spillet startes, så er spillerens antagede niveau det samme
  niveau for den valgte bane.
- Der skal ikke være login. Der er kun 1 bruger profil, som gemmes i
  localStorage.
