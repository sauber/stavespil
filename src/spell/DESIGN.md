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

TIDSSCORE: Forventet tid/bogstav = 2s × (sværhedsværdi 1.0–3.0). Faktisk tid
fra 1. bogstav til korrekt stavning. Tidsscore/ord = min(150, forventet/faktisk
× 100). Gennemsnit over 20 ord.

SAMLET = (fejlrate × 0.6) + (tidsscore × 0.4).

NIVEÆNDRING: Score ≥75 → +1. Score 40–74 → uændret. Score <40 → −1. Niveau:
1–100. Første gang = valgt baneniveau.

## Spiller niveau

- Når alle ord er stavet, så er banen færdig

Når en spiller er færdig med banen, så returneres en samlet bedømmelse:

- -1 = Gennemført værre end forventet og lavere niveau anbefales
- 0 = Godkendt men mere træning på samme niveau anbefales
- +1 = Bedre end forventet og højere niveau anbefales

Udregning af score for banen er uafhængig af niveau eller historik for spiller.
