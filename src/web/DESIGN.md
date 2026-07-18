Tech stack: Deno, Hono, Tailwind CSS, recharts (niveaugraf), framer-motion
(animationer), canvas-confetti (trofæ-fejring).

Design Preferences

Minimalistisk børnevenlig stil — rent layout, rolige pasteller (lys blå #B8DEFF,
lysegrøn #B8F0C8, varm hvid #FAFAF7, blødrosa accenter #FFD6E0), store runde
former, tydelig Sans-serif skrift (stor skriftstørrelse). Tastatur: grid af
runde knapper, inaktive bogstaver dæmpede (lav opacity). Bogstavrammer: store
firkantede/runde felter med tydelig border. Animationer: subtile og rolige —
bogstav 'falder på plads' ved korrekt input, fejl giver en lille rysten.
Trofæer: farverige emoji-ikoner med titel. Ingen mørk baggrund. Responsivt —
primært tablet, men fungerer på desktop.

SPILFLOW: Ét ord ad gangen præsenteres. Billede vises, lyd afspilles automatisk
og kan genafspilles. Tomme bogstavrammer (antal = ordets længde) vises.
Spilleren trykker bogstaver på on-screen tastatur (dansk alfabet inkl. æ, ø, å).
Korrekte bogstaver udfylder rammer i rækkefølge med animation. Ved forkert
bogstav halveres aktive bogstaver. Efter 4 fejl er kun ordets bogstaver aktive.
Ordet vises aldrig som tekst. Næste ord starter automatisk ved korrekt stavning.

MENUSKÆRM: Spilleren ser sit nuværende niveau og en linjegraf med niveauhistorik
(recharts). Alle 100 niveauer vises i en scrollbar liste med et eksempelord fra
hvert. Spilleren vælger niveau og starter banen. Spillerens trofæsamling vises
nederst på menuskærmen som et gitter af trofækort (emoji + titel + dato). Låste
trofæer vises gråtonede med et låseikon.

## Præsentation

- Det ord som skal staves udvælges af spillet, men vises ikke.
- Lydfilen afspilles for ordet. Spilleren kan genafspille lydfilen.
- Billedet for ordet vises.
- Der vises et antal tommer rammer svarende til antallet af bogstaver i order.
- Efterhånden som ordet staves udfyldes rammerne med bogstaver.
- Der vises et tastatur med bogstaver. Fra starten er alle bogstaver aktive.
- Hver gang der staves et bogstav forkert, så bliver halvdelen af de aktive
  bogstaver, og som ikke skal bruges i ordet, gjort inaktive.
- Efter 4 fejl er kun bogstaver som indgår i ordet aktive, og disse kan ikke
  gøres inaktive.

## Input

- På en bane trykker spilleren bogstaver på tastaturet.
- Spillet reagerer på hvert tryk.

## Design

- Aldersgruppen for spillet er børn i 3. til 6. klassetrin.
- Der skal være opmuntrende og motiverende beskeder når stavning går dårligt.
- Der skal tildeles sjove trofæer når stavning går godt.
