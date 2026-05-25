// pindock.js — Floating, persistent indicator for pinned planets.
// Sits in the bottom-right corner once at least one planet is pinned,
// so the comparison shelf stays visible from any section of the page.

import { bus, pinnedPlanets, clearPinned, setSelected, removePinned } from "./state.js";
import { computeHabitability, scoreColor }   from "./habitability.js";
import { RADAR_COLORS }                       from "./radar.js";
import { showDetailCard }                     from "./tooltip.js";

let dockEl = null;

function render() {
  if (!dockEl) return;
  if (pinnedPlanets.length === 0) {
    dockEl.classList.remove("visible");
    dockEl.innerHTML = "";
    return;
  }

  const chips = pinnedPlanets.map((p, i) => {
    const col = RADAR_COLORS.pins[i % RADAR_COLORS.pins.length];
    const { score } = computeHabitability(p);
    const esiCol = scoreColor(score);
    const esiLabel = score != null ? score.toFixed(0) : "?";
    return `
      <button class="dock-chip" data-name="${p.pl_name}"
              style="border-color:${col};"
              title="Open ${p.pl_name}">
        <span class="dock-dot" style="background:${col}"></span>
        <span class="dock-name">${p.pl_name}</span>
        <span class="dock-esi" style="color:${esiCol}">${esiLabel}</span>
        <span class="dock-x" data-name="${p.pl_name}" title="Remove pin">×</span>
      </button>`;
  }).join("");

  dockEl.innerHTML = `
    <div class="dock-header">
      <span class="dock-title">Pinned · ${pinnedPlanets.length}</span>
      <button class="dock-clear" title="Clear all pins">Clear</button>
    </div>
    <div class="dock-chips">${chips}</div>
  `;

  dockEl.classList.add("visible");

  dockEl.querySelector(".dock-clear")
    ?.addEventListener("click", e => { e.stopPropagation(); clearPinned(); });

  dockEl.querySelectorAll(".dock-chip").forEach(btn => {
    btn.addEventListener("click", e => {
      // The × span is inside the button; route accordingly
      const xHit = e.target.closest(".dock-x");
      if (xHit) {
        e.stopPropagation();
        const target = pinnedPlanets.find(p => p.pl_name === xHit.dataset.name);
        if (target) removePinned(target);
        return;
      }
      const name = btn.dataset.name;
      const target = pinnedPlanets.find(p => p.pl_name === name);
      if (!target) return;
      setSelected(target);
      showDetailCard(target, { scrollIntoView: true });
    });
  });
}

export function initPinDock() {
  dockEl = document.createElement("aside");
  dockEl.id = "pin-dock";
  document.body.appendChild(dockEl);
  bus.on("pinned-changed", render);
  render();
}
