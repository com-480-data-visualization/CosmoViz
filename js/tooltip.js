// tooltip.js — shared floating tooltip + pinned detail card with radar

import { renderRadar, RADAR_COLORS }                                from "./radar.js";
import { renderGauge, renderBreakdown, computeHabitability, scoreColor } from "./habitability.js";
import {
  bus,
  pinnedPlanets, isPinned, togglePinned, removePinned, clearPinned,
  PIN_LIMIT,
  setSelected, EARTH,
} from "./state.js";

let tooltipEl   = null;
let currentCard = null;          // currently-displayed planet in #detail-card

function ensureTooltip() {
  if (!tooltipEl) {
    tooltipEl = d3.select("body").append("div")
      .attr("id", "tooltip")
      .style("display", "none")
      .style("pointer-events", "none")
      .node();
  }
  return d3.select(tooltipEl);
}

// ── FORMAT HELPERS ────────────────────────────────────────────────────────────
function fmt(val, decimals, unit) {
  return val != null ? `${(+val).toFixed(decimals)} ${unit}` : "—";
}
function fmtInt(val, unit) {
  return val != null ? `${Math.round(+val)} ${unit}` : "—";
}

// ── MAIN SHOW / HIDE (floating tooltip on hover) ──────────────────────────────
export function showTooltip(event, d) {
  const tt = ensureTooltip();
  const isEarth = d.isEarth;

  const hzNote = d.hz_ratio != null
    ? `${d.hz_ratio.toFixed(2)}× HZ center`
    : "";

  const { score } = computeHabitability(d);
  const esiCol = scoreColor(score);
  const esiTxt = isEarth
    ? `<span class="tt-esi" style="color:${esiCol}">ESI 100 · reference</span>`
    : score != null
      ? `<span class="tt-esi" style="color:${esiCol}">ESI ${score.toFixed(1)}</span>`
      : `<span class="tt-esi tt-esi-dim">ESI —</span>`;

  tt.style("display", "block").html(`
    <div class="tt-head">
      <div class="tt-name">${d.pl_name}${isEarth ? " 🌍" : ""}</div>
      ${esiTxt}
    </div>
    <div class="tt-class">${d.size_class || "?"} · ${d.star_class || "?"} star</div>
    <div class="tt-body">
      <div class="tt-row"><span>Radius</span><span>${fmt(d.pl_rade, 2, "R⊕")}</span></div>
      <div class="tt-row"><span>Temperature</span><span>${fmtInt(d.pl_eqt, "K")}</span></div>
      <div class="tt-row"><span>Period</span><span>${fmt(d.pl_orbper, 1, "days")}</span></div>
      <div class="tt-row"><span>Mass</span><span>${d.pl_bmasse != null ? fmt(d.pl_bmasse, 1, "M⊕") : "not measured"}</span></div>
      ${d.pl_insol != null ? `<div class="tt-row"><span>Insolation</span><span>${fmt(d.pl_insol, 2, "S⊕")}</span></div>` : ""}
      ${hzNote ? `<div class="tt-row"><span>HZ position</span><span>${hzNote}</span></div>` : ""}
      <div class="tt-row"><span>Distance</span><span>${d.sy_dist ? fmtInt(d.sy_dist, "pc") : "—"}</span></div>
      <div class="tt-row"><span>Discovered</span><span>${d.disc_year || "—"}</span></div>
      <div class="tt-row"><span>Host star</span><span>${d.hostname || "—"}</span></div>
    </div>
    <div class="tt-hint">${isEarth ? "" : "Click to open comparison ↗"}</div>
  `);

  moveTooltip(event);
}

export function moveTooltip(event) {
  if (!tooltipEl) return;
  const tt = d3.select(tooltipEl);
  const w = window.innerWidth;
  const ttWidth = 240;
  const x = event.pageX;
  const left = x + ttWidth + 20 > w
    ? x - ttWidth - 10
    : x + 14;
  tt.style("left", `${left}px`)
    .style("top",  `${event.pageY - 28}px`);
}

export function hideTooltip() {
  if (!tooltipEl) return;
  d3.select(tooltipEl).style("display", "none");
}

// ── DETAIL CARD WITH EMBEDDED RADAR ──────────────────────────────────────────
// When opts.scrollIntoView is true, the page smoothly scrolls to bring the
// card into the viewport — useful when a planet is clicked from a section
// other than the explorer (sky map, narrative, etc.).
export function showDetailCard(d, opts = {}) {
  const card = d3.select("#detail-card");
  currentCard = d;

  if (!d) { card.style("display", "none").html(""); return; }

  const isEarth = d.isEarth;

  card.style("display", "block").html(`
    <button class="detail-close" id="detail-close-btn" title="Close">✕</button>

    <div class="detail-header">
      <div>
        <div class="detail-name">${d.pl_name}${isEarth ? " 🌍" : ""}</div>
        <div class="detail-class">
          ${d.size_class || "?"} · ${d.star_class || "?"} star
          ${d.disc_year ? ` · ${d.disc_year}` : ""}
        </div>
      </div>
      <div class="detail-actions">
        ${isEarth ? "" : `
          <button id="pin-btn" class="pin-btn"
                  title="Add this planet to the radar overlay">
            ${isPinned(d) ? "★ Pinned" : "☆ Pin to compare"}
          </button>
          <button id="clear-pins-btn" class="pin-clear"
                  title="Clear all pinned planets"
                  ${pinnedPlanets.length === 0 ? "disabled" : ""}>
            Clear pins
          </button>
        `}
      </div>
    </div>

    <div class="detail-layout">
      <div class="detail-radar-wrap">
        <div id="detail-radar" class="detail-radar"></div>
        <div class="detail-radar-note">
          Each axis is on a log-ratio scale relative to Earth.
          Earth sits at the dashed pentagon (×1). Outside the outer ring
          means the value is &gt; 1,000× Earth; inside the center means &lt; 1/1,000×.
        </div>
      </div>

      <div class="detail-stats">
        <div id="esi-gauge" class="esi-gauge"></div>
        <div id="esi-breakdown" class="esi-breakdown"></div>

        <details class="detail-stats-collapse">
          <summary>All measured properties</summary>
          <table class="detail-table">
            <tr><td>Radius</td>           <td>${fmt(d.pl_rade, 3, "R⊕")}</td></tr>
            <tr><td>Mass</td>             <td>${d.pl_bmasse != null ? fmt(d.pl_bmasse, 2, "M⊕") : "not measured"}</td></tr>
            <tr><td>Temperature</td>      <td>${fmtInt(d.pl_eqt, "K")}</td></tr>
            <tr><td>Orbital period</td>   <td>${fmt(d.pl_orbper, 2, "days")}</td></tr>
            <tr><td>Semi-major axis</td>  <td>${fmt(d.pl_orbsmax, 3, "au")}</td></tr>
            <tr><td>Insolation</td>       <td>${d.pl_insol != null ? fmt(d.pl_insol, 2, "S⊕") : "—"}</td></tr>
            <tr><td>Eccentricity</td>     <td>${fmt(d.pl_orbeccen, 3, "")}</td></tr>
            <tr><td>HZ ratio</td>         <td>${d.hz_ratio != null ? d.hz_ratio.toFixed(3) : "—"}</td></tr>
            <tr><td>Host star</td>        <td>${d.hostname || "—"} (${d.star_class || "?"})</td></tr>
            <tr><td>Star temperature</td> <td>${fmtInt(d.st_teff, "K")}</td></tr>
            <tr><td>Distance</td>         <td>${d.sy_dist ? fmtInt(d.sy_dist, "pc") : "—"}</td></tr>
            <tr><td>Planets in system</td><td>${d.sy_pnum || "—"}</td></tr>
          </table>
        </details>

        ${!isEarth ? `
          <a class="detail-link"
             href="https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(d.hostname || d.pl_name)}"
             target="_blank" rel="noopener">
            View on NASA Exoplanet Archive ↗
          </a>` : ""}
      </div>
    </div>

    <div class="pinned-strip" id="pinned-strip"></div>
  `);

  // Render radar with: current planet first (so it gets "selected" color),
  // followed by every pinned planet that isn't the current one.
  const layered = [d, ...pinnedPlanets.filter(p => p.pl_name !== d.pl_name)];
  renderRadar("#detail-radar", layered);

  // Habitability score + per-axis breakdown
  renderGauge("#esi-gauge", d);
  renderBreakdown("#esi-breakdown", d);

  renderPinnedStrip();
  wireDetailActions();

  // Smooth-scroll the card into view when invoked from a far-away section.
  // We check that the card is meaningfully outside the viewport before
  // scrolling, so the page doesn't jump for an in-view click.
  if (opts.scrollIntoView) {
    const cardEl = document.getElementById("detail-card");
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      const offscreen = rect.top < 0 || rect.bottom > vh;
      if (offscreen) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }
}

// ── PINNED STRIP (chips at the bottom of the card) ────────────────────────────
// Each chip carries the same color as its polygon on the radar so the user
// can match them visually. Clicking a chip swaps the viewed planet.
function renderPinnedStrip() {
  const strip = document.getElementById("pinned-strip");
  if (!strip) return;
  if (pinnedPlanets.length === 0) { strip.innerHTML = ""; return; }

  const currentName = currentCard?.pl_name;

  // Color resolution: matches the radar palette logic in radar.js.
  // If the chip's planet is the current one, it gets the "selected" blue.
  // Otherwise it gets a pin color based on its index among *non-current* pins.
  const others = pinnedPlanets.filter(p => p.pl_name !== currentName);
  function chipColor(p) {
    if (p.pl_name === currentName) return RADAR_COLORS.selected;
    const idx = others.findIndex(o => o.pl_name === p.pl_name);
    return RADAR_COLORS.pins[idx % RADAR_COLORS.pins.length];
  }

  const chips = pinnedPlanets.map(p => {
    const { score } = computeHabitability(p);
    const esiCol   = scoreColor(score);
    const esiLabel = score != null ? `${score.toFixed(0)}` : "?";
    const col      = chipColor(p);
    const isActive = p.pl_name === currentName;
    return `
    <span class="pin-chip${isActive ? " pin-chip-active" : ""}"
          data-name="${p.pl_name}"
          style="border-color:${col}; ${isActive ? `background:${col}1f;` : ""}"
          title="View ${p.pl_name}">
      <span class="pin-chip-dot" style="background:${col}"></span>
      <span class="pin-chip-name">${p.pl_name}</span>
      <span class="pin-chip-esi" style="color:${esiCol}; border-color:${esiCol}40">
        ESI ${esiLabel}
      </span>
      <button class="pin-chip-x" data-name="${p.pl_name}" title="Remove pin">×</button>
    </span>`;
  }).join("");

  strip.innerHTML = `
    <div class="pinned-label">
      Pinned (${pinnedPlanets.length}/${PIN_LIMIT}) — click to view:
    </div>
    <div class="pinned-chips">${chips}</div>
  `;

  // Chip body click → navigate to that planet
  strip.querySelectorAll(".pin-chip").forEach(chip => {
    chip.addEventListener("click", e => {
      if (e.target.closest(".pin-chip-x")) return;     // × handled below
      const name = chip.getAttribute("data-name");
      const target = pinnedPlanets.find(p => p.pl_name === name);
      if (!target || target.pl_name === currentName) return;
      setSelected(target);
      showDetailCard(target);
    });
  });

  // × removes a pin without changing the current view
  strip.querySelectorAll(".pin-chip-x").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const name = btn.getAttribute("data-name");
      const target = pinnedPlanets.find(p => p.pl_name === name);
      if (target) removePinned(target);
    });
  });
}

// ── BUTTON WIRING ─────────────────────────────────────────────────────────────
function wireDetailActions() {
  document.getElementById("detail-close-btn")
    ?.addEventListener("click", () => showDetailCard(null));

  document.getElementById("pin-btn")?.addEventListener("click", () => {
    if (currentCard && !currentCard.isEarth) togglePinned(currentCard);
  });

  document.getElementById("clear-pins-btn")?.addEventListener("click", () => {
    clearPinned();
  });
}

// ── BUS: refresh radar + chips whenever pin state changes ─────────────────────
bus.on("pinned-changed", () => {
  if (!currentCard) return;
  // Re-render just the radar + pin UI (not the whole card)
  const layered = [
    currentCard,
    ...pinnedPlanets.filter(p => p.pl_name !== currentCard.pl_name),
  ];
  renderRadar("#detail-radar", layered);

  // Pin button label
  const pinBtn = document.getElementById("pin-btn");
  if (pinBtn && !currentCard.isEarth) {
    pinBtn.textContent = isPinned(currentCard) ? "★ Pinned" : "☆ Pin to compare";
  }
  // Clear button disabled state
  const clearBtn = document.getElementById("clear-pins-btn");
  if (clearBtn) clearBtn.disabled = pinnedPlanets.length === 0;

  renderPinnedStrip();
});
