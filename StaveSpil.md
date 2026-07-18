# Stave Spil

Et dansk stavespil til børn i 3.–6. klasse, der hjælper dem med at lære at stave
danske ord. Spillet bruger lyd og billeder til at præsentere ord, og et
interaktivt bogstavtastatur til input.

## Roller

Der er ingen profiler, ingen login, ingen admin og ingen forældreroller.
Fremgang for spilleren på enheden og andre spil data gemmes i localStorage.

## Flow

- Ved opstart sikres at database med ordgrupper er genereret.
- En menu præsenteres hvor spilleren kan se sin fremgang og vælge niveau for
  næste bane.
- Bane: Spilleren staver ordene på banen
- Fremgang: Spillerens nye niveau udregnes efter endt bane og tilføjes til
  spillerens historik.

## Feedback

- Spilleren opmuntres undervejs på banen både ved korrekt stavning og ved fejl.

## Ord database

- Download en liste med hyppigste danske ord
- Fordel ordene i niveauer efter sværhedsgrad.
- Samme antal ord i hvert niveau
- Sværhedsgrad er baseret på ordlængde, hyppighed i sproget, antal stavelser,
  lydrethed og konsonantklynger.

## Menuskærm

- Vis spillerens nuværende (dvs. seneste) niveau og graf med niveauhistorik
- Vis alle niveauer med eksempel ord fra hvert niveau.
- Lad spilleren vælge et niveau. Når niveauet er valgt, går spillet i gang.

## Spillets regler

- For at gennemføre en bane skal alle ord staves korrekt.
- Spillet udvælger ordene fra databasen.
- Ordene på banen består af valgte niveau, samt fra niveauet under og over.
- Spilleren præsenteres for ordet med udtale og et billede som repræsenterer
  ordet.
- Spilleren staver ordene.
- Ordet skal staves med bogstaver i korrekt rækkefølge.
- Når et ord er stavet korrekt, så går spillet videre til næste ord.
- Banen er færdig når alle ord er skrevet.
- Nyt niveau for spilleren udregnes når banen er færdig, og nyt niveau tilføjes
  til historik.
