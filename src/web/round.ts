/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { createRound } from "../spell/mod.ts";
import type { EngineState, Round, RoundResult } from "../spell/mod.ts";
import { imageLoader } from "../image/mod.ts";
import { staticSoundLoader } from "../sound/mod.ts";
import { shuffle, VOWELS } from "../gameState/mod.ts";
import {
  buildPlayerStats,
  calculateNewRank,
  getEarnedTrophyIds,
  loadProfile,
  saveProfile,
} from "../player/mod.ts";
import { checkTrophies } from "../reward/mod.ts";
import type { Trophy } from "../reward/mod.ts";

const DANISH_LETTERS = [..."abcdefghijklmnopqrstuvwxyzæøå"];
const KEYBOARD_ROWS = [
  [..."qwertyuiopå"],
  [..."asdfghjklæø"],
  [..."zxcvbnm"],
];
const ADVANCE_DELAY_MS = 1600;

const pathMatch = /^\/round\/(\d+)/.exec(location.pathname);
const difficulty = Math.max(
  1,
  Math.min(
    100,
    pathMatch
      ? Number(pathMatch[1])
      : Number(new URLSearchParams(location.search).get("level")) || 1,
  ),
);

/**
 * Synthesize subtle audible key feedback via the Web Audio API.
 *
 * Correct letters rise through the C-major scale (H = B) and resolve to a
 * C–E chord on the final letter of a word; wrong letters play a short click.
 * The AudioContext is created lazily on the first key press (a user gesture,
 * satisfying the browser autoplay policy) and falls back to silence if Web
 * Audio is unavailable.
 */
function createKeyFeedback(): {
  correct(letter: number, wordLength: number): void;
  wrong(): void;
} {
  let audioCtx: AudioContext | null = null;
  const SCALE = [0, 2, 4, 5, 7, 9, 11];

  function getContext(): AudioContext | null {
    const Ctor = globalThis.AudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  }

  function tone(freq: number, duration: number, volume: number): void {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /** Frequency of a scale degree counted from C4 (degrees 1..7 = C D E F G A H). */
  function degreeFreq(degree: number): number {
    const idx = degree - 1;
    const octave = Math.floor(idx / 7);
    const step = SCALE[((idx % 7) + 7) % 7];
    return 261.63 * Math.pow(2, (octave * 12 + step) / 12);
  }

  return {
    correct(letter, wordLength) {
      if (letter === wordLength) {
        tone(degreeFreq(8), 0.7, 0.09);
        tone(degreeFreq(10), 0.7, 0.07);
        return;
      }
      const degree = 9 - wordLength + (letter - 1);
      tone(degreeFreq(degree), 0.35, 0.12);
    },
    wrong() {
      const ctx = getContext();
      if (!ctx) return;
      const frameSize = Math.floor(ctx.sampleRate * 0.04);
      const buffer = ctx.createBuffer(1, frameSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frameSize; i++) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1200;
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
    },
  };
}

/**
 * Create and run the round UI for the current difficulty.
 *
 * All per-round state is captured in this closure so a single running round
 * owns exactly one controller instance (matching the spell engine's factory
 * pattern). On complete, saves the result to the player profile and renders
 * the result screen.
 */
function createRoundController(): void {
  let app: HTMLElement;
  let round: Round;
  let lastWordIndex = -1;
  let prevWordErrors = 0;
  let activeLetters = new Set(DANISH_LETTERS);
  let advanceTimeout: ReturnType<typeof setTimeout> | null = null;
  let currentImageUrl: string | null = null;
  let currentSoundUrl: string | null = null;
  let audioEl: HTMLAudioElement;
  let completed = false;
  let frameErrorSeen = 0;
  let prevFilledCount = 0;
  const feedback = createKeyFeedback();
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  function flashKey(letter: string): HTMLElement | null {
    const key = app?.querySelector<HTMLElement>(`.key[data-letter="${letter}"]`);
    if (key) key.classList.add("pressed");
    return key;
  }

  function clearPressedKeys(): void {
    app?.querySelectorAll<HTMLElement>(".key.pressed").forEach((el) => {
      el.classList.remove("pressed");
    });
  }

  function createApp(): void {
    app = document.querySelector<HTMLElement>("main#app")!;
    audioEl = document.createElement("audio");
    app.innerHTML = `
      <div class="round-header">
        <span class="round-progress">Henter ord og billeder…</span>
        <span class="round-errors"></span>
      </div>
      <div class="word-area">
        <div class="image-frame">
          <img class="word-image" alt="Billede" />
          <button class="sound-button" type="button" title="Lyt igen">🔊</button>
          <span class="sound-hint" hidden>Lyd ikke tilgængelig</span>
        </div>
        <div class="letter-frames"></div>
        <div class="cheer-bubble"></div>
      </div>
      <div class="keyboard"></div>
    `;

    app.querySelector<HTMLButtonElement>(".sound-button")!.addEventListener(
      "click",
      () => {
        if (audioEl.src) {
          audioEl.currentTime = 0;
          audioEl.play().catch(() => {});
        }
      },
    );

    const keyboard = app.querySelector<HTMLElement>(".keyboard")!;
    for (const row of KEYBOARD_ROWS) {
      const rowEl = document.createElement("div");
      rowEl.className = "keyboard-row";
      for (const letter of row) {
        const key = document.createElement("button");
        key.className = "key";
        key.type = "button";
        key.dataset.letter = letter;
        key.textContent = letter.toUpperCase();
        key.addEventListener("click", () => {
          round.enterLetter(letter);
          key.blur();
        });
        const clear = () => key.classList.remove("pressed");
        key.addEventListener("pointerup", clear);
        key.addEventListener("pointerleave", clear);
        key.addEventListener("pointercancel", clear);
        rowEl.appendChild(key);
      }
      keyboard.appendChild(rowEl);
    }

    const letterSet = new Set(DANISH_LETTERS);
    keydownHandler = (e: KeyboardEvent) => {
      if (completed) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === " ") {
        e.preventDefault();
        if (audioEl.src) {
          audioEl.currentTime = 0;
          audioEl.play().catch(() => {});
        }
        return;
      }
      const ch = e.key.toLowerCase();
      if (ch.length === 1 && letterSet.has(ch)) {
        e.preventDefault();
        clearPressedKeys();
        flashKey(ch);
        round.enterLetter(ch);
      }
    };
    document.addEventListener("keydown", keydownHandler);
    document.addEventListener("keyup", () => clearPressedKeys());
  }

  function showError(message: string): void {
    const target = document.querySelector<HTMLElement>("main#app");
    const box = document.createElement("div");
    box.className = "error-box";
    box.innerHTML = `
      <p>${message}</p>
      <a class="menu-button" href="/">Til forsiden</a>
    `;
    if (target) {
      target.innerHTML = "";
      target.appendChild(box);
    }
  }

  function updateImage(bytes: Uint8Array): void {
    if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
    const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
    currentImageUrl = URL.createObjectURL(blob);
    const img = app.querySelector<HTMLImageElement>(".word-image")!;
    img.src = currentImageUrl;
  }

  function updateSound(bytes: Uint8Array): void {
    if (currentSoundUrl) URL.revokeObjectURL(currentSoundUrl);
    currentSoundUrl = null;
    audioEl.removeAttribute("src");
    if (bytes.length === 0) {
      app.querySelector<HTMLElement>(".sound-hint")!.hidden = false;
      return;
    }
    const blob = new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" });
    currentSoundUrl = URL.createObjectURL(blob);
    audioEl.src = currentSoundUrl;
    app.querySelector<HTMLElement>(".sound-hint")!.hidden = true;
  }

  function playSound(): void {
    if (audioEl.src) {
      audioEl.play().catch(() => {});
    }
  }

  function renderHeader(state: EngineState): void {
    const progress = app.querySelector<HTMLElement>(".round-progress")!;
    const errors = app.querySelector<HTMLElement>(".round-errors")!;
    progress.textContent =
      `Bane ${difficulty} — Ord ${state.wordIndex + 1} af ${state.totalWords}`;
    errors.textContent = `Fejl: ${state.totalErrors}`;
  }

  function renderFrames(state: EngineState): void {
    const framesEl = app.querySelector<HTMLElement>(".letter-frames")!;
    framesEl.innerHTML = "";
    const currentPos = state.frames.filter((f) => f !== null).length;
    const isError = state.wordErrors > frameErrorSeen;
    const word = state.word;
    for (let i = 0; i < state.frames.length; i++) {
      const frame = state.frames[i];
      const div = document.createElement("div");
      let cls = `letter-frame ${frame ? "filled" : "empty"}`;
      if (VOWELS.has(word[i])) cls += " vowel";
      if (!frame && isError && i === currentPos) {
        cls += " wrong";
      }
      div.className = cls;
      if (frame) div.textContent = frame.toUpperCase();
      framesEl.appendChild(div);
    }
    frameErrorSeen = state.wordErrors;
  }

  function renderCheer(state: EngineState): void {
    const cheerEl = app.querySelector<HTMLElement>(".cheer-bubble")!;
    if (state.cheer) {
      cheerEl.textContent = `${state.cheer.emoji} ${state.cheer.text}`;
      cheerEl.className = `cheer-bubble visible ${state.cheer.style}`;
      setTimeout(() => {
        if (!state.cheer) return;
        cheerEl.className = "cheer-bubble";
      }, state.cheer.duration);
    } else {
      cheerEl.className = "cheer-bubble";
      cheerEl.textContent = "";
    }
  }

  function renderKeyboard(): void {
    const keys = app.querySelectorAll<HTMLButtonElement>(".key");
    for (const key of keys) {
      const letter = key.dataset.letter!;
      key.classList.toggle("dimmed", !activeLetters.has(letter));
    }
  }

  function handleDimming(state: EngineState): void {
    if (state.wordErrors <= prevWordErrors) return;
    const wordSet = new Set(state.wordLetters.map((l) => l.toLowerCase()));
    const nonWord = [...activeLetters].filter((l) => !wordSet.has(l));
    const half = Math.ceil(nonWord.length / 2);
    for (const letter of shuffle(nonWord).slice(0, half)) {
      activeLetters.delete(letter);
    }
    if (state.wordErrors >= 4) {
      for (const letter of [...activeLetters]) {
        if (!wordSet.has(letter)) activeLetters.delete(letter);
      }
    }
    prevWordErrors = state.wordErrors;
  }

  function handleState(state: EngineState): void {
    const filledCount = state.frames.filter((f) => f !== null).length;
    if (state.wordIndex !== lastWordIndex) {
      lastWordIndex = state.wordIndex;
      clearPressedKeys();
      prevWordErrors = 0;
      frameErrorSeen = 0;
      prevFilledCount = 0;
      activeLetters = new Set(DANISH_LETTERS);
      updateImage(state.image);
      updateSound(state.sound);
      playSound();
    } else {
      if (state.wordErrors > prevWordErrors) {
        feedback.wrong();
      } else if (filledCount > prevFilledCount) {
        feedback.correct(filledCount, state.word.length);
      }
      handleDimming(state);
    }
    prevFilledCount = filledCount;

    renderHeader(state);
    renderFrames(state);
    renderCheer(state);
    renderKeyboard();

    if (state.isComplete) {
      completeRound();
      return;
    }

    if (state.isWordComplete && advanceTimeout === null) {
      advanceTimeout = setTimeout(() => {
        advanceTimeout = null;
        round.nextWord();
      }, ADVANCE_DELAY_MS);
    }
  }

  function startConfetti(): void {
    const colors = ["#B8DEFF", "#B8F0C8", "#FFD6E0", "#FFE28A"];
    const container = document.createElement("div");
    container.className = "confetti-container";
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = `${2 + Math.random() * 2}s`;
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      container.appendChild(piece);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 3000);
  }

  function rankChangeMessage(levelChange: number, newRank: number): string {
    if (levelChange > 0) {
      return `Tillykke! Du er nået til niveau ${newRank}.`;
    }
    if (levelChange < 0) {
      return `Godt forsøgt. Dit niveau er nu ${newRank}. Prøv et lettere niveau næste gang.`;
    }
    return `Flot spillet! Du er stadig på niveau ${newRank}. Prøv igen for at komme videre.`;
  }

  function renderResult(
    result: RoundResult,
    newRank: number,
    levelChange: number,
    trophies: Trophy[],
  ): void {
    const rankSymbol =
      levelChange > 0 ? "▲" : levelChange < 0 ? "▼" : "—";
    const trophiesHtml = trophies.length
      ? `
        <div class="new-trophies">
          <h3>Nyt trofæ!</h3>
          <div class="trophy-grid">
            ${trophies.map((t) => `
              <div class="trophy-card">
                <span class="emoji">${t.emoji}</span>
                <div class="title">${t.title}</div>
                <div class="desc">${t.description}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `
      : "";

    app.innerHTML = `
      <div class="result-panel">
        <h2>Bane færdig!</h2>
        <div class="result-score">${Math.round(result.score)}</div>
        <div class="result-label">score</div>
        <div class="result-message">${rankChangeMessage(levelChange, newRank)}</div>
        <div class="result-stats">
          <span class="stat-badge">Fejl: ${result.errors}</span>
          <span class="stat-badge">Tid: ${Math.round(result.totalTime)}s</span>
          <span class="stat-badge">${rankSymbol} Niveau ${newRank}</span>
        </div>
        ${trophiesHtml}
        <div class="result-actions">
          <a class="menu-button" href="/">Til forsiden</a>
          <a class="menu-button" href="/round/${newRank}">Spil niveau ${newRank}</a>
        </div>
      </div>
    `;

    if (trophies.length) startConfetti();
  }

  function completeRound(): void {
    if (completed) return;
    completed = true;
    clearPressedKeys();

    if (keydownHandler) {
      document.removeEventListener("keydown", keydownHandler);
      document.removeEventListener("keyup", clearPressedKeys);
      keydownHandler = null;
    }

    const result = round.getResult();
    const profile = loadProfile();
    const stats = buildPlayerStats(profile);
    const prevRank = stats.currentRank;
    const newRank = calculateNewRank(
      prevRank,
      result.difficulty,
      result.rankChange,
    );
    const levelChange = newRank - prevRank;
    const earnedIds = getEarnedTrophyIds(profile);
    const trophies = checkTrophies(
      result,
      { ...stats, currentRank: newRank },
      earnedIds,
    );

    profile.roundHistory.push({
      difficulty: result.difficulty,
      result: result.rankChange,
      newRank,
      errors: result.errors,
      totalTime: result.totalTime,
      trophiesUnlocked: trophies.map((t) => t.id),
      timestamp: Date.now(),
    });
    saveProfile(profile);

    renderResult(result, newRank, levelChange, trophies);
  }

  async function startRound(): Promise<void> {
    createApp();
    const loadSound = staticSoundLoader();
    const safeSoundLoader = async (word: string): Promise<Uint8Array> => {
      try {
        return await loadSound(word);
      } catch {
        return new Uint8Array(0);
      }
    };
    try {
      round = await createRound({
        difficulty,
        imageLoader: imageLoader(import.meta.env.VITE_PIXABAY_API_KEY ?? ""),
        soundLoader: safeSoundLoader,
        onStateChange: handleState,
      });
    } catch (err) {
      showError(
        `Kunne ikke starte banen: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  const pixabayKey = import.meta.env.VITE_PIXABAY_API_KEY;

  if (!pixabayKey) {
    showError("API-nøgle mangler. Tilføj VITE_PIXABAY_API_KEY til .env");
  } else {
    startRound();
  }
}

createRoundController();
