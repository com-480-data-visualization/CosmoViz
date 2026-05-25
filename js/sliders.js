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

  // List planet names if count is small enough, otherwise show actionable
  // hints so the user understands *why* they see zero.
  const listEl = document.getElementById("earth-like-list");
  if (listEl) {
    if (matching.length > 0 && matching.length <= 12) {
      listEl.innerHTML = matching
        .map(d => `<span class="planet-chip">${d.pl_name}</span>`)
        .join(" ");
    } else if (matching.length > 12) {
      listEl.textContent = `${matching.length} planets — hover the scatter to explore them`;
    } else {
      listEl.innerHTML = `
        <div class="no-match">No planets match all criteria.</div>
        <div class="no-match-hint">${noMatchHint()}</div>
      `;
    }
  }
}

// Diagnose which axis is the binding constraint and suggest an action.
function noMatchHint() {
  const { radius, temp, period } = earthCriteria;
  const inRadius = corePlanets.filter(d =>
    d.pl_rade != null && d.pl_rade >= radius.min && d.pl_rade <= radius.max
  ).length;
  const inTemp = corePlanets.filter(d =>
    d.pl_eqt != null && d.pl_eqt >= temp.min && d.pl_eqt <= temp.max
  ).length;
  const inPeriod = corePlanets.filter(d =>
    d.pl_orbper != null && d.pl_orbper >= period.min && d.pl_orbper <= period.max
  ).length;

  const counts = [
    { label: "period",      n: inPeriod },
    { label: "temperature", n: inTemp   },
    { label: "radius",      n: inRadius },
  ].sort((a, b) => a.n - b.n);
  const tightest = counts[0];

  if (tightest.n === 0) {
    return `No TESS planet matches the <strong>${tightest.label}</strong> range alone.
            Try widening it.`;
  }
  return `The tightest single constraint is <strong>${tightest.label}</strong>
          (${tightest.n} planets).
          Earth-like is genuinely rare in the TESS catalog — try widening one bound.`;
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

// Defaults — single source of truth, used both at first render and on reset.
const DEFAULTS = {
  radius: { min: 0.8, max: 1.5 },
  temp:   { min: 180, max: 350 },
  period: { min: 10,  max: 500 },
  insol:  { min: 0.5, max: 1.5 },
};

// ── RESET ─────────────────────────────────────────────────────────────────────
function resetCriteria() {
  Object.assign(earthCriteria.radius, DEFAULTS.radius);
  Object.assign(earthCriteria.temp,   DEFAULTS.temp);
  Object.assign(earthCriteria.period, DEFAULTS.period);
  Object.assign(earthCriteria.insol,  DEFAULTS.insol);

  // Sync DOM controls
  const pairs = [
    ["r-min", DEFAULTS.radius.min], ["r-max", DEFAULTS.radius.max],
    ["t-min", DEFAULTS.temp.min],   ["t-max", DEFAULTS.temp.max],
    ["p-min", DEFAULTS.period.min], ["p-max", DEFAULTS.period.max],
  ];
  pairs.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  setLabel("r-min-val", DEFAULTS.radius.min.toFixed(1));
  setLabel("r-max-val", DEFAULTS.radius.max.toFixed(1));
  setLabel("t-min-val", DEFAULTS.temp.min);
  setLabel("t-max-val", DEFAULTS.temp.max);
  setLabel("p-min-val", DEFAULTS.period.min);
  setLabel("p-max-val", DEFAULTS.period.max);

  updateEarthLikeCount();
}

function setLabel(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
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
        Temperature: <strong><span id="t-min-val">180</span>–<span id="t-max-val">350</span> K</strong>
      </label>
      <div class="dual-slider">
        <input type="range" id="t-min" min="100" max="1500" step="10" value="180">
        <input type="range" id="t-max" min="100" max="1500" step="10" value="350">
      </div>
    </div>

    <div class="slider-row">
      <label>
        Orbital period: <strong><span id="p-min-val">10</span>–<span id="p-max-val">500</span> days</strong>
      </label>
      <div class="dual-slider">
        <input type="range" id="p-min" min="1" max="500" step="1" value="10">
        <input type="range" id="p-max" min="1" max="500" step="1" value="500">
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
