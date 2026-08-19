/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import {
  buildPlayerStats,
  clearProfile,
  getEarnedTrophyIds,
  loadProfile,
} from "../player/mod.ts";
import { clear as clearCache } from "../cache/cache.ts";
import { getAllTrophies } from "../reward/mod.ts";
import { loadWords } from "../words/load.ts";
import type { WordGroups } from "../words/generate.ts";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderProgression(
  profile: ReturnType<typeof loadProfile>,
): HTMLElement {
  const section = document.createElement("section");
  const stats = buildPlayerStats(profile);

  if (profile.roundHistory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent =
      "Ingen spillede baner endnu. Vælg et niveau for at komme i gang!";
    section.appendChild(empty);

    const levelBtn = document.createElement("a");
    levelBtn.className = "level-button";
    levelBtn.setAttribute("href", "/round/1");
    levelBtn.textContent = "Spil niveau 1";
    section.appendChild(levelBtn);

    return section;
  }

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
    line.setAttribute("stroke", "#e0e0e0");
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
  path.setAttribute("stroke", "#8BC6F5");
  path.setAttribute("stroke-width", "2.5");
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
    circle.setAttribute("r", "3.5");
    circle.setAttribute("fill", "#5BA8DE");
    svg.appendChild(circle);
  }

  const container = document.createElement("div");
  container.className = "chart-container";
  container.appendChild(svg);
  section.appendChild(container);

  const statsRow = document.createElement("div");
  statsRow.className = "stats-row";
  statsRow.innerHTML = `
    <span class="stat-badge">Baner: ${stats.totalRounds}</span>
  `;
  section.appendChild(statsRow);

  const levelBtn = document.createElement("a");
  levelBtn.className = "level-button";
  levelBtn.setAttribute("href", `/round/${stats.currentRank}`);
  levelBtn.textContent = `Spil niveau ${stats.currentRank}`;
  section.appendChild(levelBtn);

  return section;
}

function renderTrophies(profile: ReturnType<typeof loadProfile>): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = "Trofæer";
  section.appendChild(heading);

  const allTrophies = getAllTrophies();
  const earnedIds = new Set(getEarnedTrophyIds(profile));

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
      <div class="title">${isEarned ? trophy.title : "???"}</div>
      <div class="desc">${isEarned ? trophy.description : ""}</div>
      ${dateStr ? `<div class="date">${dateStr}</div>` : ""}
    `;
    grid.appendChild(card);
  }

  section.appendChild(grid);
  return section;
}

function renderLevelSelection(groups: WordGroups): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = "Vælg niveau";
  section.appendChild(heading);

  const list = document.createElement("div");
  list.className = "level-list";

  for (let level = 0; level < 100; level++) {
    const item = document.createElement("a");
    item.className = "level-item";
    item.setAttribute("href", `/round/${level + 1}`);

    const words = groups[level]
      ? [...groups[level]]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.word)
        .join(", ")
      : "...";

    item.innerHTML = `
      <span class="level-number">${level + 1}.</span>
      <span class="level-words">${words}</span>
    `;
    item.addEventListener("click", () => {
      location.href = `/round/${level + 1}`;
    });
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

function renderResetButton(): HTMLElement {
  const btn = document.createElement("button");
  btn.className = "reset-button";
  btn.textContent = "Nulstil spil";
  btn.addEventListener("click", () => {
    const ok = window.confirm(
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
  app.appendChild(renderLevelSelection(groups));
  app.appendChild(renderResetButton());

  document.body.appendChild(app);
}

render();
