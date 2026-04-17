// sliders.js — Earth-like criteria dual-sliders + live planet counter
// Writes to earthCriteria in state.js; emits "earth-like-highlight" on the bus.

import { corePlanets }       from "./data.js";
import { bus, earthCriteria } from "./state.js";

// ── HELPERS ───────────────────────────────────────────────────────────────────
function clamp(val, lo, hi) { return Math.max(lo, Math.min(hi, val)); }

// ── COUNT & HIGHLIGHT ─────────────────────────────────────────────────────────
function updateEarthLikeCount() {
  const { radius, temp, period } = earthCriteria;

  // 3-criterion match (radius + temp + period)
  const matching = corePlanets.filter(d =>
    d.pl_rade   != null && d.pl_rade   >= radius.min && d.pl_rade   <= radius.max &&
    d.pl_eqt    != null && d.pl_eqt    >= temp.min   && d.pl_eqt    <= temp.max   &&
    d.pl_orbper != null && d.pl_orbper >= period.min  && d.pl_orbper <= period.max
  );

  // Optional 4th criterion: insolation flux
  const matchingInsol = matching.filter(d =>
    d.pl_insol != null &&
    d.pl_insol >= earthCriteria.insol.min &&
    d.pl_insol <= earthCriteria.insol.max
  );

  const countEl = document.getElementById("earth-like-count");
  if (countEl) countEl.textContent = matching.length;

  const insolEl = document.getElementById("earth-like-insol-count");
  if (insolEl) {
    insolEl.textContent = matchingInsol.length > 0
      ? `(${matchingInsol.length} also match insolation flux)`
      : matching.length > 0
        ? "(none additionally match insolation ≈1 S⊕)"
        : "";
  }

  // Emit matching names so scatter can highlight them
  bus.emit("earth-like-highlight", matching.map(d => d.pl_name));

  // List planet names if count is small enough
  const listEl = document.getElementById("earth-like-list");
  if (listEl) {
    if (matching.length > 0 && matching.length <= 12) {
      listEl.innerHTML = matching
        .map(d => `<span class="planet-chip">${d.pl_name}</span>`)
        .join(" ");
    } else if (matching.length > 12) {
      listEl.textContent = `${matching.length} planets — hover the scatter to explore them`;
    } else {
      listEl.innerHTML = `<span class="no-match">No planets match all criteria</span>`;
    }
  }
}

// ── SLIDER WIRING ─────────────────────────────────────────────────────────────
function wireSlider(minId, maxId, minLabelId, maxLabelId, criterionKey, formatFn) {
  const minEl = document.getElementById(minId);
  const maxEl = document.getElementById(maxId);
  const minLabel = document.getElementById(minLabelId);
  const maxLabel = document.getElementById(maxLabelId);

  if (!minEl || !maxEl) return;

  function sync() {
    // Prevent min > max cross-over
    let lo = +minEl.value;
    let hi = +maxEl.value;
    if (lo > hi) {
      // Push them apart
      if (document.activeElement === minEl) hi = lo;
      else lo = hi;
      minEl.value = lo;
      maxEl.value = hi;
    }
    if (minLabel) minLabel.textContent = formatFn(lo);
    if (maxLabel) maxLabel.textContent = formatFn(hi);
    earthCriteria[criterionKey].min = lo;
    earthCriteria[criterionKey].max = hi;
    updateEarthLikeCount();
  }

  minEl.addEventListener("input", sync);
  maxEl.addEventListener("input", sync);
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function resetCriteria() {
  const defaults = {
    radius: { min: 0.8,  max: 1.5  },
    temp:   { min: 200,  max: 320  },
    period: { min: 200,  max: 500  },
    insol:  { min: 0.5,  max: 1.5  },
  };

  Object.assign(earthCriteria.radius, defaults.radius);
  Object.assign(earthCriteria.temp,   defaults.temp);
  Object.assign(earthCriteria.period, defaults.period);
  Object.assign(earthCriteria.insol,  defaults.insol);

  // Sync DOM
  const ids = [
    ["r-min", 0.8],  ["r-max", 1.5],
    ["t-min", 200],  ["t-max", 320],
    ["p-min", 200],  ["p-max", 500],
  ];
  ids.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  ["r-min-val","r-max-val"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = [0.8, 1.5][i].toFixed(1);
  });
  ["t-min-val","t-max-val"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = [200, 320][i];
  });
  ["p-min-val","p-max-val"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = [200, 500][i];
  });

  updateEarthLikeCount();
}

// ── BUILD HTML ────────────────────────────────────────────────────────────────
function buildSliderHTML(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = `
    <h3>Earth-like criteria</h3>
    <p class="slider-subtitle">Adjust what counts as "Earth-like" and watch the count update live.</p>

    <div class="slider-row">
      <label>
        Radius: <strong><span id="r-min-val">0.8</span>–<span id="r-max-val">1.5</span> R⊕</strong>
      </label>
      <div class="dual-slider">
        <input type="range" id="r-min" min="0.5" max="4.0" step="0.1" value="0.8">
        <input type="range" id="r-max" min="0.5" max="4.0" step="0.1" value="1.5">
      </div>
    </div>

    <div class="slider-row">
      <label>
        Temperature: <strong><span id="t-min-val">200</span>–<span id="t-max-val">320</span> K</strong>
      </label>
      <div class="dual-slider">
        <input type="range" id="t-min" min="100" max="1500" step="10" value="200">
        <input type="range" id="t-max" min="100" max="1500" step="10" value="320">
      </div>
    </div>

    <div class="slider-row">
      <label>
        Orbital period: <strong><span id="p-min-val">200</span>–<span id="p-max-val">500</span> days</strong>
      </label>
      <div class="dual-slider">
        <input type="range" id="p-min" min="10" max="500" step="5" value="200">
        <input type="range" id="p-max" min="10" max="500" step="5" value="500">
      </div>
    </div>

    <div class="counter-box">
      <span id="earth-like-count">0</span>
      <span class="counter-label"> planets match all criteria</span>
      <div id="earth-like-insol-count" class="counter-sub"></div>
    </div>

    <div id="earth-like-list" class="planet-list"></div>

    <button id="reset-criteria">↺ Reset to Earth values</button>
  `;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initSliders(selector) {
  buildSliderHTML(selector);

  // Wire sliders
  wireSlider("r-min", "r-max", "r-min-val", "r-max-val", "radius",
    v => v.toFixed(1));
  wireSlider("t-min", "t-max", "t-min-val", "t-max-val", "temp",
    v => Math.round(v));
  wireSlider("p-min", "p-max", "p-min-val", "p-max-val", "period",
    v => Math.round(v));

  document.getElementById("reset-criteria")
    ?.addEventListener("click", resetCriteria);

  // When filter-changed (from crossfilter), re-run count
  bus.on("filter-changed", () => updateEarthLikeCount());

  // Initial count
  updateEarthLikeCount();
}
