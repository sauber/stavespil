/// <reference lib="dom" />

const match = globalThis.location.pathname.match(/\/level\/(\d+)/);
const difficulty = match ? Number(match[1]) : 0;
document.title = `Level ${difficulty}`;

const h1 = document.querySelector("h1");
if (h1) h1.textContent = `Level ${difficulty}`;

const menu = document.createElement("a");
menu.href = "/";
menu.textContent = "Menu";
document.body.appendChild(menu);
