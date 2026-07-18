Store data about player level and progress

MENUSKÆRM: Spilleren ser sit nuværende niveau og en linjegraf med niveauhistorik
(recharts). Alle 100 niveauer vises i en scrollbar liste med et eksempelord fra
hvert. Spilleren vælger niveau og starter banen. Spillerens trofæsamling vises
nederst på menuskærmen som et gitter af trofækort (emoji + titel + dato). Låste
trofæer vises gråtonede med et låseikon.

LOCALSTORAGE STRUKTUR:

playerLevel: int (1–100)

levelHistory: array {timestamp, level}

trophies: array {id, unlockedAt}

gameStats: {totalGames, levelsSeen: [set of level numbers]}
