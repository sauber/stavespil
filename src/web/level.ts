/// <reference lib="dom" />

import { createRound } from "../spell/mod.ts";
import type {
  EngineState,
  MediaLoader,
  Round,
  RoundResult,
} from "../spell/mod.ts";
import { imageLoader } from "../image/mod.ts";
import {
  buildPlayerStats,
  calculateNewRank,
  loadProfile,
  saveProfile,
} from "../player/mod.ts";
import type { PlayerStats } from "../gameState/mod.ts";
import { checkTrophies } from "../reward/mod.ts";

const PIXABAY_API_KEY = "56754611-2f3676f593072d805db4f2c97";
const VOICERSS_API_KEY = "89a1e7aac32243ba9d6989139cb777b4";

const KEYS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "æ",
  "ø",
  "å",
];

const match = location.pathname.match(/\/level\/(\d+)/);
const difficulty = match ? Number(match[1]) : 1;

document.title = `Level ${difficulty}`;

let round: Round;
let gameReady = false;

let currentImageURL: string | null = null;
let currentSoundWord = "";
const dimmedKeys = new Set<string>();
let advanceTimer: number | null = null;
let cheerTimer: number | null = null;
let prevWordIndex = -1;
let prevWordErrors = 0;
let lastPlayedWordIndex = -1;
let soundPending = false;

let imageEl: HTMLImageElement;
let soundEl: HTMLAudioElement;
let framesEl: HTMLElement;
let keyboardEl: HTMLElement;
let progressEl: HTMLElement;
let cheerEl: HTMLElement;
let errorsEl: HTMLElement;

function bytesToURL(bytes: Uint8Array, mime: string): string {
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}

function showLoading(): void {
  document.body.innerHTML = `
    <h1>StaveSpil</h1>
    <main class="game-screen">
      <p class="loading">Indlæser ord og billeder...</p>
    </main>
  `;
}

function showGame(): void {
  document.body.innerHTML = `
    <h1>StaveSpil</h1>
    <main class="game-screen">
      <div class="progress"></div>
      <div class="word-image-wrap">
        <img class="word-image" alt="" />
      </div>
      <button class="sound-btn" type="button">🔊 Lyt igen</button>
      <audio id="word-sound"></audio>
      <div class="letter-frames"></div>
      <div class="cheer"></div>
      <div class="keyboard"></div>
      <div class="errors"></div>
    </main>
  `;

  imageEl = document.querySelector(".word-image")!;
  soundEl = document.querySelector("#word-sound")!;
  framesEl = document.querySelector(".letter-frames")!;
  keyboardEl = document.querySelector(".keyboard")!;
  progressEl = document.querySelector(".progress")!;
  cheerEl = document.querySelector(".cheer")!;
  errorsEl = document.querySelector(".errors")!;

  document.querySelector(".sound-btn")!.addEventListener("click", () => {
    if (currentSoundWord) playSound(currentSoundWord);
  });
}

function showError(message: string): void {
  document.body.innerHTML = `
    <h1>StaveSpil</h1>
    <main class="game-screen">
      <p class="error">Fejl: ${message}</p>
      <a href="/" class="results-menu">Tilbage til menuen</a>
    </main>
  `;
}

function updateImage(bytes: Uint8Array): void {
  if (currentImageURL) URL.revokeObjectURL(currentImageURL);
  currentImageURL = bytesToURL(bytes, "image/jpeg");
  imageEl.src = currentImageURL;
}

function playSound(word: string): void {
  currentSoundWord = word;
  soundEl.src =
    `http://api.voicerss.org/?key=${VOICERSS_API_KEY}&hl=da-dk&src=${
      encodeURIComponent(word)
    }&c=MP3`;
  soundEl.play().catch(() => {
    soundPending = true;
  });
}

function playPendingSound(): void {
  if (soundPending) {
    soundPending = false;
    soundEl.play().catch(() => {
      soundPending = true;
    });
  }
}

function renderFrames(frames: (string | null)[]): void {
  framesEl.innerHTML = "";
  for (const f of frames) {
    const span = document.createElement("span");
    span.className = "letter-frame" + (f ? " filled" : "");
    span.textContent = f ?? "";
    framesEl.appendChild(span);
  }
}

function renderKeyboard(
  wordLetters: string[],
  wordErrors: number,
  isWordComplete: boolean,
): void {
  keyboardEl.innerHTML = "";
  const wordLetterSet = new Set(wordLetters);

  for (const key of KEYS) {
    const btn = document.createElement("button");
    btn.className = "key";
    btn.textContent = key;
    btn.type = "button";

    const isDimmed = isWordComplete ||
      (wordErrors >= 4 ? !wordLetterSet.has(key) : dimmedKeys.has(key));

    if (isDimmed) {
      btn.classList.add("dimmed");
      btn.disabled = true;
    }

    btn.addEventListener("click", () => {
      playPendingSound();
      round.enterLetter(key);
    });

    keyboardEl.appendChild(btn);
  }
}

function updateCheer(cheer: EngineState["cheer"]): void {
  if (cheerTimer !== null) {
    clearTimeout(cheerTimer);
    cheerTimer = null;
  }

  if (cheer) {
    cheerEl.textContent = `${cheer.emoji} ${cheer.text}`;
    cheerEl.classList.add("visible");
    cheerTimer = setTimeout(() => {
      cheerEl.classList.remove("visible");
      cheerTimer = null;
    }, cheer.duration) as unknown as number;
  } else {
    cheerEl.classList.remove("visible");
  }
}

function updateDimming(state: EngineState): void {
  if (state.wordIndex !== prevWordIndex) {
    dimmedKeys.clear();
    prevWordErrors = 0;
    prevWordIndex = state.wordIndex;
  }

  if (state.wordErrors > prevWordErrors) {
    if (state.wordErrors >= 4) {
      const wordLetterSet = new Set(state.wordLetters);
      for (const key of KEYS) {
        if (!wordLetterSet.has(key)) {
          dimmedKeys.add(key);
        }
      }
    } else {
      const wordLetterSet = new Set(state.wordLetters);
      const activeNonWord = KEYS.filter(
        (k) => !wordLetterSet.has(k) && !dimmedKeys.has(k),
      );
      const toDim = Math.ceil(activeNonWord.length / 2);
      const shuffled = [...activeNonWord].sort(() => Math.random() - 0.5);
      for (let i = 0; i < toDim; i++) {
        dimmedKeys.add(shuffled[i]);
      }
    }
    prevWordErrors = state.wordErrors;
  }
}

function onStateChange(state: EngineState): void {
  if (state.isComplete) {
    handleComplete();
    return;
  }

  if (!gameReady) {
    showGame();
    gameReady = true;
  }

  updateDimming(state);
  updateImage(state.image);
  if (round && state.wordIndex !== lastPlayedWordIndex) {
    lastPlayedWordIndex = state.wordIndex;
    const words = round.getWords();
    playSound(words[state.wordIndex]);
  }
  renderFrames(state.frames);
  renderKeyboard(state.wordLetters, state.wordErrors, state.isWordComplete);

  progressEl.textContent = `Ord ${state.wordIndex + 1} af ${state.totalWords}`;
  errorsEl.textContent = `Fejl: ${state.totalErrors}`;

  updateCheer(state.cheer);

  if (advanceTimer !== null) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
  if (state.isWordComplete && !state.isComplete) {
    advanceTimer = setTimeout(
      () => round.nextWord(),
      2000,
    ) as unknown as number;
  }
}

function handleComplete(): void {
  if (advanceTimer !== null) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }

  const result = round.getResult();

  const profile = loadProfile();
  const oldStats = buildPlayerStats(profile);
  const newRank = calculateNewRank(
    oldStats.currentRank,
    difficulty,
    result.rankChange,
  );

  const newStats: PlayerStats = {
    totalRounds: oldStats.totalRounds + 1,
    distinctDifficulties: [
      ...new Set([...oldStats.distinctDifficulties, difficulty]),
    ],
    currentRank: newRank,
  };

  const earnedIds = [
    ...new Set(profile.roundHistory.flatMap((e) => e.trophiesUnlocked)),
  ];
  const newTrophies = checkTrophies(result, newStats, earnedIds);

  profile.roundHistory.push({
    difficulty,
    result: result.rankChange,
    newRank,
    errors: result.errors,
    totalTime: result.totalTime,
    trophiesUnlocked: newTrophies.map((t) => t.id),
    timestamp: Date.now(),
  });
  saveProfile(profile);

  showResults(result, newRank, newTrophies);
}

function showResults(
  result: RoundResult,
  newRank: number,
  newTrophies: Array<{ emoji: string; title: string }>,
): void {
  const rankClass = result.rankChange === 1
    ? "rank-up"
    : result.rankChange === -1
    ? "rank-down"
    : "rank-same";
  const rankSymbol = result.rankChange === 1
    ? "▲"
    : result.rankChange === -1
    ? "▼"
    : "—";

  const trophiesHTML = newTrophies.length > 0
    ? `<div class="results-trophies">
          <h3>Nye trofæer!</h3>
          ${
      newTrophies.map((t) =>
        `<div class="trophy-item">${t.emoji} ${t.title}</div>`
      ).join("")
    }
        </div>`
    : "";

  document.body.innerHTML = `
    <h1>StaveSpil</h1>
    <main class="results">
      <div class="results-score">${Math.round(result.score)}</div>
      <div class="results-label">Score</div>
      <div class="results-stats">
        <span>Fejl: ${result.errors}</span>
        <span>Tid: ${Math.round(result.totalTime)}s</span>
        <span>Streak: ${result.maxStreak}</span>
      </div>
      <div class="results-rank ${rankClass}">${rankSymbol} Rang: ${newRank}</div>
      ${trophiesHTML}
      <a href="/" class="results-menu">Tilbage til menuen</a>
    </main>
  `;
}

document.addEventListener("keydown", (e) => {
  playPendingSound();
  if (!round || round.isComplete()) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.repeat) return;

  const key = e.key.toLowerCase();
  if (key.length === 1 && KEYS.includes(key)) {
    e.preventDefault();
    round.enterLetter(key);
  }
});

const noopSoundLoader: MediaLoader = () => Promise.resolve(new Uint8Array(0));

async function main(): Promise<void> {
  showLoading();

  try {
    round = await createRound({
      difficulty,
      imageLoader: imageLoader(PIXABAY_API_KEY),
      soundLoader: noopSoundLoader,
      onStateChange,
    });
    playSound(round.getWords()[0]);
  } catch (e) {
    showError(e instanceof Error ? e.message : "Kunne ikke indlæse banen");
  }
}

main();
