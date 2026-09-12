/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import {
  buildPlayerStats,
  clearProfile,
  getEarnedTrophyIds,
  loadProfile,
} from "../player/mod.ts";
import type { PlayerProfile } from "../player/mod.ts";
import { clear as clearCache } from "../cache/cache.ts";
import { getAllTrophies } from "../reward/mod.ts";
import { loadWords } from "../words/load.ts";
import type { WordGroups } from "../words/generate.ts";

/** Rank tiers give progress a friendly color and emoji. */
const RANK_TIERS: Array<{ max: number; emoji: string; css: string }> = [
  { max: 9, emoji: "🌱", css: "tier-starter" },
  { max: 24, emoji: "⭐", css: "tier-explorer" },
  { max: 49, emoji: "💫", css: "tier-skipper" },
  { max: 74, emoji: "🤩", css: "tier-star" },
  { max: 99, emoji: "🦄", css: "tier-unicorn" },
  { max: 100, emoji: "👑", css: "tier-king" },
];

/** Pastel colors cycling per 10-level zone. */
const ZONE_COLORS = [
  "#B8DEFF",
  "#B8F0C8",
  "#FFD6E0",
  "#FFE28A",
  "#D6C9FF",
  "#FFC9A8",
  "#A8E6CF",
  "#FFD3A5",
  "#C4E0F9",
  "#F9C6D7",
];

function rankTier(rank: number): { emoji: string; css: string } {
  return RANK_TIERS.find((t) => rank <= t.max) ?? RANK_TIERS[0];
}

function zoneColor(level: number): string {
  return ZONE_COLORS[(level - 1) % ZONE_COLORS.length];
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function makePlayButton(level: number): HTMLElement {
  const btn = document.createElement("a");
  btn.className = "level-button cta";
  btn.setAttribute("href", `/round/${level}`);
  btn.textContent = `▶️ Spil niveau ${level}`;
  return btn;
}

function renderProgression(profile: PlayerProfile): HTMLElement {
  const section = document.createElement("section");
  section.className = "progress-section";
  const stats = buildPlayerStats(profile);

  if (profile.roundHistory.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <span class="empty-emoji">🧸</span>
      <p class="empty-message">Velkommen! Vælg et niveau nedenfor, og lad os
        stave sammen.</p>
    `;
    section.appendChild(empty);
    section.appendChild(makePlayButton(1));
    return section;
  }

  const tier = rankTier(stats.currentRank);
  const badge = document.createElement("div");
  badge.className = `rank-badge ${tier.css}`;
  badge.innerHTML = `
    <span class="rank-emoji">${tier.emoji}</span>
    <span class="rank-label">Dit niveau</span>
    <span class="rank-value">${stats.currentRank}</span>
  `;
  section.appendChild(badge);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 560 200");
  svg.classList.add("chart");

  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 32;
  const w = 560 - padL - padR;
  const h = 200 - padT - padB;

  const entries = [...profile.roundHistory];
  const minX = entries[0].timestamp;
  const maxX = entries[entries.length - 1].timestamp;
  const rangeX = maxX - minX || 1;

  const padY = 4;
  const minDiff = Math.max(1, Math.min(...entries.map((e) => e.newRank)) - padY);
  const maxDiff = Math.min(100, Math.max(...entries.map((e) => e.newRank)) + padY);
  const rangeDiff = maxDiff - minDiff || 1;

  function x(ts: number): number {
    return padL + ((ts - minX) / rangeX) * w;
  }
  function y(d: number): number {
    return padT + h - ((d - minDiff) / rangeDiff) * h;
  }

  // grid lines
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const val = minDiff + (rangeDiff * i) / yTicks;
    const yy = y(val);
    const line = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    line.setAttribute("x1", String(padL));
    line.setAttribute("x2", String(padL + w));
    line.setAttribute("y1", String(yy));
    line.setAttribute("y2", String(yy));
    line.setAttribute("stroke", "#e8e8f0");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);

    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    label.setAttribute("x", String(padL - 6));
    label.setAttribute("y", String(yy + 4));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("font-size", "10");
    label.setAttribute("fill", "#999");
    label.textContent = String(Math.round(val));
    svg.appendChild(label);
  }

  // axis labels
  const yLabel = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  yLabel.setAttribute("x", "8");
  yLabel.setAttribute("y", String(padT + h / 2));
  yLabel.setAttribute("text-anchor", "middle");
  yLabel.setAttribute("font-size", "10");
  yLabel.setAttribute("fill", "#999");
  yLabel.setAttribute(
    "transform",
    `rotate(-90, 8, ${padT + h / 2})`,
  );
  yLabel.textContent = "Niveau";
  svg.appendChild(yLabel);

  // x-axis date labels — skip any that would overlap
  const minLabelGap = 70;
  let lastLabelX = -Infinity;
  for (const e of entries) {
    const lx = x(e.timestamp);
    if (lx - lastLabelX < minLabelGap) continue;
    lastLabelX = lx;

    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    label.setAttribute("x", String(lx));
    label.setAttribute("y", String(padT + h + 20));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "9");
    label.setAttribute("fill", "#999");
    label.textContent = formatDate(e.timestamp);
    svg.appendChild(label);

    const tick = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    tick.setAttribute("x1", String(lx));
    tick.setAttribute("x2", String(lx));
    tick.setAttribute("y1", String(padT + h));
    tick.setAttribute("y2", String(padT + h + 4));
    tick.setAttribute("stroke", "#ccc");
    tick.setAttribute("stroke-width", "1");
    svg.appendChild(tick);
  }

  // line path
  const d = entries
    .map((e, i) => `${i === 0 ? "M" : "L"}${x(e.timestamp).toFixed(1)},${y(e.newRank).toFixed(1)}`)
    .join(" ");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#5BA8DE");
  path.setAttribute("stroke-width", "3.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);

  // dots
  for (const e of entries) {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", String(x(e.timestamp)));
    circle.setAttribute("cy", String(y(e.newRank)));
    circle.setAttribute("r", "5");
    circle.setAttribute("fill", "#FFB3C6");
    circle.setAttribute("stroke", "#fff");
    circle.setAttribute("stroke-width", "2");
    svg.appendChild(circle);
  }

  const container = document.createElement("div");
  container.className = "chart-container";
  container.appendChild(svg);
  section.appendChild(container);

  const statsRow = document.createElement("div");
  statsRow.className = "stats-row";
  statsRow.innerHTML = `
    <span class="stat-badge">🕹️ Baner: ${stats.totalRounds}</span>
    <span class="stat-badge">🏅 Niveau: ${stats.currentRank}</span>
  `;
  section.appendChild(statsRow);

  section.appendChild(makePlayButton(stats.currentRank));

  return section;
}

function renderTrophies(profile: PlayerProfile): HTMLElement {
  const section = document.createElement("section");
  section.className = "trophies-section";
  const heading = document.createElement("h2");
  heading.textContent = "🏆 Trofæer";
  section.appendChild(heading);

  const allTrophies = getAllTrophies();
  const earnedIds = new Set(getEarnedTrophyIds(profile));

  const chip = document.createElement("span");
  chip.className = "trophy-count";
  chip.textContent = `${earnedIds.size} af ${allTrophies.length}`;
  heading.appendChild(chip);

  const earnedDates = new Map<string, number>();
  for (const entry of profile.roundHistory) {
    for (const id of entry.trophiesUnlocked) {
      if (!earnedDates.has(id)) {
        earnedDates.set(id, entry.timestamp);
      }
    }
  }

  const grid = document.createElement("div");
  grid.className = "trophy-grid";

  for (const trophy of allTrophies) {
    const isEarned = earnedIds.has(trophy.id);
    const card = document.createElement("div");
    card.className = `trophy-card${isEarned ? "" : " locked"}`;

    const dateStr = isEarned && earnedDates.has(trophy.id)
      ? formatDate(earnedDates.get(trophy.id)!)
      : "";

    card.innerHTML = `
      <span class="emoji">${trophy.emoji}</span>
      <div class="title">${trophy.title}</div>
      <div class="desc">${trophy.description}</div>
      ${dateStr ? `<div class="date">${dateStr}</div>` : ""}
    `;
    grid.appendChild(card);
  }

  section.appendChild(grid);
  return section;
}

function renderLevelSelection(
  groups: WordGroups,
  profile: PlayerProfile,
): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = "🎯 Vælg niveau";
  section.appendChild(heading);

  const stats = buildPlayerStats(profile);
  const played = new Set(profile.roundHistory.map((e) => e.difficulty));

  const list = document.createElement("div");
  list.className = "level-list";

  for (let level = 0; level < 100; level++) {
    const num = level + 1;
    const item = document.createElement("a");
    item.className = "level-item";
    item.setAttribute("href", `/round/${num}`);
    if (num === stats.currentRank) {
      item.classList.add("current");
    } else if (played.has(num)) {
      item.classList.add("played");
    }

    const words = groups[level]
      ? [...groups[level]]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .join(", ")
      : "...";

    item.innerHTML = `
      <span class="level-bubble" style="background:${zoneColor(num)}">${num}</span>
      <span class="level-words">${words}</span>
      ${num === stats.currentRank ? `<span class="current-tag">⭐ Du er her</span>` : ""}
    `;
    item.addEventListener("click", () => {
      location.href = `/round/${num}`;
    });
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

function renderResetButton(): HTMLElement {
  const btn = document.createElement("button");
  btn.className = "reset-button";
  btn.textContent = "🧹 Nulstil spil";
  btn.addEventListener("click", () => {
    const ok = globalThis.confirm(
      "Dette sletter al din fremgang, alle trofæer og alle downloadede billeder. Kan ikke fortrydes. Fortsæt?",
    );
    if (!ok) return;
    clearProfile();
    clearCache();
    location.reload();
  });
  return btn;
}

async function render(): Promise<void> {
  const profile = loadProfile();
  const groups = await loadWords();

  const h1 = document.querySelector("h1");
  if (h1) h1.textContent = "Stave Mester";

  const app = document.createElement("main");
  app.appendChild(renderProgression(profile));
  app.appendChild(renderTrophies(profile));
  app.appendChild(renderLevelSelection(groups, profile));
  app.appendChild(renderResetButton());

  document.body.appendChild(app);
}

render();