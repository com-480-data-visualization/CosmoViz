// habitability.js — Earth-similarity score, verdict, gauge, and breakdown
//
// Formula: weighted geometric mean of per-axis ESI components
//   ESI_i  = 1 − | x − x⊕ | / | x + x⊕ |        ∈ [0, 1]
//   score  = 100 · Π ESI_i^(w_i / Σw)
//
// Weights are inspired by Schulze-Makuch et al. 2011 ESI:
//   radius 0.57, surface temperature 5.58, insolation 1.07, mass 1.07
// Earth scores exactly 100 by construction.

const AXES = [
  { key: "pl_rade",   label: "Radius",      unit: "R⊕", earth: 1.0, weight: 0.57 },
  { key: "pl_eqt",    label: "Temperature", unit: "K",  earth: 255, weight: 5.58 },
  { key: "pl_insol",  label: "Insolation",  unit: "S⊕", earth: 1.0, weight: 1.07 },
  { key: "pl_bmasse", label: "Mass",        unit: "M⊕", earth: 1.0, weight: 1.07 },
];

function axisSimilarity(x, earth) {
  if (x == null || x <= 0) return null;
  return 1 - Math.abs(x - earth) / Math.abs(x + earth);
}

// ── PUBLIC: compute the full score breakdown ─────────────────────────────────
export function computeHabitability(planet) {
  if (!planet) return { score: null, valid: false, axes: [] };

  const axes = AXES.map(a => {
    const sim = axisSimilarity(planet[a.key], a.earth);
    return {
      key:        a.key,
      label:      a.label,
      unit:       a.unit,
      weight:     a.weight,
      value:      planet[a.key],
      earthValue: a.earth,
      similarity: sim,
    };
  });

  const valid = axes.filter(a => a.similarity != null);
  if (valid.length === 0) {
    return { score: null, valid: false, axes, missing: AXES.length };
  }

  const totalW = valid.reduce((s, a) => s + a.weight, 0);
  const product = valid.reduce(
    (p, a) => p * Math.pow(a.similarity, a.weight / totalW),
    1,
  );
  const score = Math.round(product * 100 * 10) / 10; // one decimal

  return {
    score,
    valid: true,
    axes,
    missing: AXES.length - valid.length,
  };
}

// ── PUBLIC: short interpretation phrase ──────────────────────────────────────
export function verdict(score) {
  if (score == null) return "Insufficient data";
  if (score >= 80)   return "Highly Earth-like";
  if (score >= 60)   return "Moderately similar";
  if (score >= 40)   return "Loosely similar";
  if (score >= 20)   return "Mostly dissimilar";
  return "Very dissimilar";
}

// ── PUBLIC: color matching the score bucket (used by gauge thumb & chips) ────
export function scoreColor(score) {
  if (score == null) return "#666680";
  if (score >= 80)   return "#3a9e6e";
  if (score >= 60)   return "#7ab86e";
  if (score >= 40)   return "#c4b85a";
  if (score >= 20)   return "#e07b39";
  return "#c45a7a";
}

// ── GAUGE ────────────────────────────────────────────────────────────────────
/**
 * Renders a horizontal gauge into the given element with the score, the
 * verdict and a small "missing axes" caveat when applicable.
 */
export function renderGauge(selector, planet) {
  const el = typeof selector === "string"
    ? document.querySelector(selector) : selector;
  if (!el) return;

  const { score, valid, missing } = computeHabitability(planet);
  const v   = verdict(score);
  const col = scoreColor(score);
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0;

  el.innerHTML = `
    <div class="esi-header">
      <span class="esi-label">Earth Similarity Index</span>
      <span class="esi-score" style="color:${col}">
        ${score != null ? score.toFixed(1) : "—"}
      </span>
    </div>
    <div class="esi-bar-bg">
      <div class="esi-bar-grad"></div>
      <div class="esi-bar-thumb" style="left:${pct}%; background:${col}"></div>
      ${planet.isEarth ? "" : `
        <div class="esi-earth-tick" title="Earth = 100"></div>
      `}
    </div>
    <div class="esi-scale">
      <span>0</span>
      <span>25</span>
      <span>50</span>
      <span>75</span>
      <span>100</span>
    </div>
    <div class="esi-verdict" style="color:${col}">${v}</div>
    ${(!valid || missing > 0) ? `
      <div class="esi-caveat">
        ${!valid
          ? "No measured values available to compute a score."
          : `Score computed from ${4 - missing}/4 axes — ${
              AXES.filter(a => planet[a.key] == null).map(a => a.label.toLowerCase()).join(", ")
            } missing.`}
      </div>` : ""}
  `;
}

// ── BREAKDOWN ────────────────────────────────────────────────────────────────
/**
 * Per-axis mini bars so the user can see which dimensions hurt or help the
 * score. Each axis is presented with its raw value and its similarity %.
 */
export function renderBreakdown(selector, planet) {
  const el = typeof selector === "string"
    ? document.querySelector(selector) : selector;
  if (!el) return;

  const { axes } = computeHabitability(planet);

  const rows = axes.map(a => {
    const simPct = a.similarity != null ? Math.round(a.similarity * 100) : null;
    const barW   = simPct != null ? simPct : 0;
    const valStr = a.value != null
      ? `${formatVal(a.value, a.key)} ${a.unit}`
      : "—";
    const pctStr = simPct != null ? `${simPct}%` : "n/a";
    const c      = simPct != null ? scoreColor(simPct) : "#444";

    return `
      <div class="esi-axis-row${a.similarity == null ? " esi-axis-missing" : ""}">
        <span class="esi-axis-name">${a.label}</span>
        <div class="esi-mini-bar">
          <div class="esi-mini-fill" style="width:${barW}%; background:${c}"></div>
        </div>
        <span class="esi-axis-val" title="Earth: ${a.earthValue} ${a.unit}">
          ${valStr}
        </span>
        <span class="esi-axis-pct" style="color:${c}">${pctStr}</span>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="esi-breakdown-title">How each dimension scores</div>
    ${rows}
  `;
}

// ── FORMATTERS ───────────────────────────────────────────────────────────────
function formatVal(v, key) {
  if (v == null) return "—";
  if (key === "pl_eqt")    return Math.round(v).toString();
  if (key === "pl_orbper") return v.toFixed(1);
  return v.toFixed(2);
}

export { AXES as HAB_AXES };
