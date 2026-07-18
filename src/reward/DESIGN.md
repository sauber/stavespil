OPMUNTRINGER UNDER SPILLET (inline feedback):

Opmuntringer vises som en lille animeret tekstboble øverst på skærmen og
forsvinder efter 2 sekunder. De udløses af:

1. fejl på et ord: 'Ups! Prøv igen 😊' (blåd, neutral)

2. fejl på samme ord: 'Tænk på lyden! 👂' (hjælpende)

3. fejl på samme ord: 'Du kan godt! 💪' (opmuntrende)

4. fejl på samme ord: 'Se bogstaverne der lyser! 💡' (værktøjshenvisning)

Korrekt stavning uden fejl: 'Perfekt! ⭐' (fejret)

Korrekt stavning med 1–2 fejl: 'Godt klaret! 👍'

5 ord i træk uden fejl: 'Fantastisk streak! 🔥' (milestone-boble, større og
længere varighed)

TROFÆER — TYPER, UDLØSNING OG VISNING:

Der er 12 trofæer i alt. Hvert trofæ kan kun optjænes én gang (første gang
betingelsen opfyldes). De gemmes i localStorage som array: {id, unlockedAt
(timestamp)}.

TROFÆTYPER:

🌟 'Første bane' — Fuldfør din allerførste bane

🏆 'Stavemester' — Opnå score ≥90 på en bane

🚀 'Lynhurtig' — Fuldfør en bane med tidsscore ≥90

✨ 'Fejlfri' — Fuldfør en bane med 0 fejl

🔥 'På række' — Stav 10 ord i træk uden fejl (inden for én bane)

📚 'Flittig' — Fuldfør 5 baner i alt

📈 'På vej op' — Ryk op i niveau for første gang

🏔️ 'Bjergbestiger' — Nå niveau 10

⚡ 'Ekspres' — Fuldfør en bane på under 3 minutter

🌈 'Regnbue' — Fuldfør baner på 5 forskellige niveauer

🦉 'Natteravn' — Nå niveau 25

👑 'Kongen af ord' — Nå niveau 50

VISNING AF NYT TROFÆ: Når et trofæ opnås for første gang, vises en
fejlringsskjærm med stort emoji, trofætitlen og en kort beskrivelse.
Confetti-animation i 3 sekunder. Knap: 'Videre'. Dette vises én gang og kan ikke
genudsøses.

TROFÆSAMLING PÅ MENUSKÆRM: Gitter af 12 trofækort (3 kolonner). Oplåste trofæer:
fuldt farvet (emoji + titel + dato for opnåelse). Låste: gråtonet med 🔒-ikon og
trofætitlen skjult (❓).

CONFETTI: canvas-confetti bibliotek (allerede installeret).
