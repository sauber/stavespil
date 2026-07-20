/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { loadProfile, getEarnedTrophyIds, buildPlayerStats } from "../player/mod.ts";
import { getAllTrophies } from "../reward/mod.ts";
import { loadWords } from "../words/load.ts";
import type { WordGroups } from "../words/generate.ts";

const COLORS = {
  blue: "#B8DEFF",
  green: "#B8F0C8",
  warmWhite: "#FAFAF7",
  pink: "#FFD6E0",
} as const;

const STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: ${COLORS.warmWhite};
    color: #333;
    padding: 1.5rem;
    max-width: 600px;
    margin: 0 auto;
  }
  h1 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 0.25rem;
  }
  h2 {
    font-size: 1.4rem;
    margin: 2rem 0 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 3px solid ${COLORS.blue};
  }
  .rank-display {
    text-align: center;
    background: ${COLORS.blue};
    border-radius: 1rem;
    padding: 1.5rem;
    margin-bottom: 0.5rem;
  }
  .rank-display .rank-number {
    font-size: 4rem;
    font-weight: 800;
    line-height: 1;
  }
  .rank-display .rank-label {
    font-size: 1rem;
    opacity: 0.7;
    margin-top: 0.25rem;
  }
  .history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .history-table th {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 2px solid #ccc;
    font-weight: 600;
  }
  .history-table td {
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }
  .history-table tr:nth-child(even) {
    background: ${COLORS.blue}40;
  }
  .rank-up { color: #2d8a4e; font-weight: 700; }
  .rank-down { color: #c0392b; font-weight: 700; }
  .rank-same { color: #888; }
  .empty-message {
    text-align: center;
    color: #999;
    padding: 2rem;
    font-style: italic;
  }
  .trophy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }
  .trophy-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1rem;
    text-align: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }
  .trophy-card.locked {
    opacity: 0.45;
    filter: grayscale(1);
  }
  .trophy-card .emoji {
    font-size: 2.2rem;
    display: block;
    margin-bottom: 0.3rem;
  }
  .trophy-card .title {
    font-size: 0.85rem;
    font-weight: 600;
  }
  .trophy-card .desc {
    font-size: 0.7rem;
    color: #777;
    margin-top: 0.15rem;
  }
  .trophy-card .date {
    font-size: 0.65rem;
    color: #aaa;
    margin-top: 0.3rem;
  }
  .trophy-card.locked .title::after {
    content: " 🔒";
  }
  .level-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }
  .level-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: white;
    border-radius: 0.5rem;
    padding: 0.6rem 1rem;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    transition: background 0.15s;
  }
  .level-item:hover {
    background: ${COLORS.green};
  }
  .level-number {
    font-weight: 800;
    font-size: 1.1rem;
    min-width: 2.5rem;
    text-align: right;
    color: #555;
  }
  .level-words {
    font-size: 0.85rem;
    color: #777;
  }
  .stats-row {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1rem;
  }
  .stat-badge {
    background: ${COLORS.green};
    border-radius: 0.5rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    font-weight: 600;
  }
`;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderRankHistory(profile: ReturnType<typeof loadProfile>): HTMLElement {
  const section = document.createElement("section");
  const stats = buildPlayerStats(profile);

  const display = document.createElement("div");
  display.className = "rank-display";
  display.innerHTML = `
    <div class="rank-number">${stats.currentRank}</div>
    <div class="rank-label">Nuværende niveau</div>
  `;
  section.appendChild(display);

  const badges = document.createElement("div");
  badges.className = "stats-row";
  badges.innerHTML = `
    <span class="stat-badge">Baner: ${stats.totalRounds}</span>
    <span class="stat-badge">Niveauer: ${stats.distinctDifficulties.length}</span>
  `;
  section.appendChild(badges);

  const heading = document.createElement("h2");
  heading.textContent = "Rangoversigt";
  section.appendChild(heading);

  if (profile.roundHistory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "Ingen spillede baner endnu. Vælg et niveau for at komme i gang!";
    section.appendChild(empty);
    return section;
  }

  const table = document.createElement("table");
  table.className = "history-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Dato</th>
        <th>Niveau</th>
        <th>Score</th>
        <th>Fejl</th>
        <th>Tid</th>
        <th>Rang</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement("tbody");

  const entries = [...profile.roundHistory].reverse();
  for (const entry of entries) {
    const tr = document.createElement("tr");
    const rankClass =
      entry.result > 0 ? "rank-up" : entry.result < 0 ? "rank-down" : "rank-same";
    const rankSymbol =
      entry.result > 0 ? "▲" : entry.result < 0 ? "▼" : "—";
    tr.innerHTML = `
      <td>${formatDate(entry.timestamp)}</td>
      <td>${entry.difficulty}</td>
      <td>${entry.errors} fejl</td>
      <td>${Math.round(entry.totalTime)}s</td>
      <td class="${rankClass}">${rankSymbol} ${entry.newRank}</td>
    `;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  section.appendChild(table);

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
    const item = document.createElement("div");
    item.className = "level-item";

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
      console.log(`Selected level: ${level + 1}`);
    });
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

async function render(): Promise<void> {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  const profile = loadProfile();
  const groups = await loadWords();

  const h1 = document.querySelector("h1");
  if (h1) h1.textContent = "StaveSpil";

  const app = document.createElement("main");
  app.appendChild(renderRankHistory(profile));
  app.appendChild(renderTrophies(profile));
  app.appendChild(renderLevelSelection(groups));

  document.body.appendChild(app);
}

render();
