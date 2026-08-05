/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { loadProfile, getEarnedTrophyIds, buildPlayerStats } from "../player/mod.ts";
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
      location.href = `/round/${level + 1}`;
    });
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

async function render(): Promise<void> {
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
