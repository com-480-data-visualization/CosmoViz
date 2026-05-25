// main.js — module orchestration entry point
// Load order: data → legend → views (all in parallel after data resolves)

import { loadData, corePlanets, allPlanets } from "./data.js";
import { renderLegend }                      from "./legend.js";
import { notifyFilterChange }                from "./state.js";
import { initNarrative }                     from "./narrative.js";
import { initScatter }                       from "./scatter.js";
import { initBias }                          from "./bias.js";
import { initSkyMap }                        from "./skymap.js";
import { initTimeline }                      from "./timeline.js";
import { initSliders }                       from "./sliders.js";
import { initSandbox }                       from "./sandbox.js";
import { initPinDock }                       from "./pindock.js";

async function main() {
  // ── Loading screen ────────────────────────────────────────────────────────
  const loader = document.getElementById("loading-overlay");

  try {
    await loadData();
  } catch (err) {
    console.error("Failed to load dataset:", err);
    if (loader) {
      loader.innerHTML = `
        <div class="loader-box">
          <p style="color:#e07b39">⚠ Could not load dataset.</p>
          <p style="font-size:13px;margin-top:8px">
            Make sure you run a local server:<br>
            <code>python3 -m http.server</code><br>
            then open <a href="http://localhost:8000" style="color:#4a7ec7">localhost:8000</a>
          </p>
        </div>`;
    }
    return;
  }

  // ── Hide loader ───────────────────────────────────────────────────────────
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 400);
  }

  // ── Update stats in the control bar ──────────────────────────────────────
  const totalEl = document.getElementById("total-planet-count");
  if (totalEl) totalEl.textContent = allPlanets.length;

  // ── Render all views ──────────────────────────────────────────────────────
  // Each view is isolated: a failure in one (e.g. missing d3 extension)
  // must not prevent the others from rendering.
  const views = [
    ["legend",    () => renderLegend("#legend-container")],
    ["narrative", () => initNarrative()],
    ["scatter",   () => initScatter("#scatter-container")],
    ["bias",      () => initBias("#bias-container")],
    ["skymap",    () => initSkyMap("#skymap-container")],
    ["timeline",  () => initTimeline("#timeline-container")],
    ["sliders",   () => initSliders("#slider-panel")],
    ["sandbox",   () => initSandbox("#sandbox-container")],
    ["pin-dock",  () => initPinDock()],
  ];
  for (const [name, fn] of views) {
    try { fn(); }
    catch (err) { console.error(`[${name}] init failed:`, err); }
  }

  // ── Initial filter push (no filters active, show all) ─────────────────────
  notifyFilterChange();
}

main();
