// sandbox.js — "Build your own planet" interactive
//
// Lets the user dial in a star + planet body + orbit, then recomputes the
// derived quantities (equilibrium temperature, insolation, period, habitable
// zone bounds, ESI). Reuses radar/habitability primitives so the score logic
// stays single-source.

import { bus }                                  from "./state.js";
import { renderGauge, renderBreakdown }         from "./habitability.js";

// ── STAR PRESETS ─────────────────────────────────────────────────────────────
const STARS = {
  M: { teff: 3300, radius: 0.36, mass: 0.40, color: "#ff8a5c",
       label: "M dwarf — cool red (e.g. TRAPPIST-1)" },
  K: { teff: 4400, radius: 0.72, mass: 0.80, color: "#ffc171",
       label: "K star — orange (e.g. ε Eridani)" },
  G: { teff: 5778, radius: 1.00, mass: 1.00, color: "#fff2a8",
       label: "G star — Sun-like" },
  F: { teff: 6500, radius: 1.30, mass: 1.30, color: "#cfe4ff",
       label: "F star — warmer white (e.g. Procyon)" },
};

// ── STATE ────────────────────────────────────────────────────────────────────
const state = {
  starKey:  "G",
  radius:   1.0,    // R⊕
  mass:     1.0,    // M⊕
  distance: 1.0,    // au
};

// ── PHYSICS ──────────────────────────────────────────────────────────────────
// L = R² · (T/T_sun)⁴  (in solar luminosities)
function L_star(star)            { return star.radius ** 2 * (star.teff / 5778) ** 4; }
// T_eq = T_star · √(R_star / 2a) · (1 − A)^¼  with A = 0.3 Bond albedo
function T_eq(star, a, A = 0.3) {
  const Rstar_au = star.radius * 0.00465;  // 1 R☉ ≈ 0.00465 au
  return star.teff * Math.sqrt(Rstar_au / (2 * a)) * Math.pow(1 - A, 0.25);
}
function insolation(star, a)     { return L_star(star) / (a * a); }              // S⊕
function gravity(m, r)           { return m / (r * r); }                         // g⊕
function period_days(star, a)    { return Math.sqrt(a ** 3 / star.mass) * 365.25; }
function HZ(star) {
  const L = L_star(star);
  return { inner: 0.95 * Math.sqrt(L), outer: 1.67 * Math.sqrt(L) };
}

// ── CLASSIFIERS (match data.js conventions) ──────────────────────────────────
function sizeClass(r) {
  if (r == null) return "Unknown";
  if (r < 1.25)  return "Rocky";
  if (r < 2.0)   return "Super-Earth";
  if (r < 4.0)   return "Sub-Neptune";
  if (r < 10.0)  return "Neptune-like";
  return "Gas Giant";
}
function starClass(t) {
  if (t < 3900) return "M";
  if (t < 5300) return "K";
  if (t < 6000) return "G";
  return "F";
}

// ── SYNTHETIC PLANET OBJECT ──────────────────────────────────────────────────
function synthPlanet() {
  const star = STARS[state.starKey];
  return {
    pl_name:   "Your planet",
    pl_rade:   state.radius,
    pl_bmasse: state.mass,
    pl_eqt:    T_eq(star, state.distance),
    pl_insol:  insolation(star, state.distance),
    pl_orbper: period_days(star, state.distance),
    pl_orbsmax: state.distance,
    st_teff:   star.teff,
    st_rad:    star.radius,
    st_mass:   star.mass,
    size_class: sizeClass(state.radius),
    star_class: starClass(star.teff),
    isSandbox: true,
  };
}

// ── PLANET PREVIEW DISC ──────────────────────────────────────────────────────
function planetColor(teq) {
  return d3.scaleLinear()
    .domain([100, 250, 400, 800, 1800])
    .range(["#3a6fd1", "#4ac5d6", "#8fdbb5", "#e8a76c", "#c4495a"])
    .clamp(true)(teq);
}

function drawPlanetPreview(planet) {
  const svg = d3.select("#sb-planet-svg");
  svg.selectAll("*").remove();

  const W = 180, H = 180;
  svg.attr("viewBox", `0 0 ${W} ${H}`)
     .attr("width", W).attr("height", H);

  const cx = W / 2, cy = H / 2;
  const star = STARS[state.starKey];

  // Defs
  const defs = svg.append("defs");
  const planetCol = planetColor(planet.pl_eqt);
  const grad = defs.append("radialGradient").attr("id", "sb-planet-grad")
    .attr("cx", "35%").attr("cy", "32%");
  grad.append("stop").attr("offset", "0%")
    .attr("stop-color", d3.color(planetCol).brighter(0.7).formatHex());
  grad.append("stop").attr("offset", "70%")
    .attr("stop-color", planetCol);
  grad.append("stop").attr("offset", "100%")
    .attr("stop-color", d3.color(planetCol).darker(1.1).formatHex());

  // Star glow at the corner — scaled by spectral type
  const starGlow = defs.append("filter").attr("id", "sb-star-glow")
    .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  starGlow.append("feGaussianBlur").attr("stdDeviation", 7);

  svg.append("circle")
    .attr("cx", 20).attr("cy", H - 20).attr("r", 18 + star.radius * 6)
    .attr("fill", star.color)
    .attr("filter", "url(#sb-star-glow)")
    .attr("opacity", 0.85);
  svg.append("circle")
    .attr("cx", 20).attr("cy", H - 20).attr("r", 8 + star.radius * 3)
    .attr("fill", star.color);

  // Atmosphere ring for puffier planets
  if (planet.pl_rade > 1.6) {
    svg.append("circle")
      .attr("cx", cx).attr("cy", cy)
      .attr("r", planetRadiusPx(planet.pl_rade) + 5)
      .attr("fill", "none")
      .attr("stroke", planetCol)
      .attr("stroke-width", 3)
      .attr("opacity", Math.min(0.45, 0.18 + Math.log10(planet.pl_rade) * 0.4));
  }

  // Planet body
  const rPx = planetRadiusPx(planet.pl_rade);
  svg.append("circle")
    .attr("cx", cx).attr("cy", cy).attr("r", rPx)
    .attr("fill", "url(#sb-planet-grad)")
    .attr("stroke", d3.color(planetCol).darker(1.2).formatHex())
    .attr("stroke-width", 0.6);
}

function planetRadiusPx(rEarth) {
  // log-mapped so a 0.3 R⊕ pebble and a 15 R⊕ gas giant both visible
  return 14 + Math.log10(Math.max(0.3, rEarth) / 0.3) * 26;
}

// ── UPDATE ───────────────────────────────────────────────────────────────────
function update() {
  const star = STARS[state.starKey];
  const planet = synthPlanet();
  const hz = HZ(star);

  // Star readout
  set("sb-star-teff", star.teff);
  set("sb-star-radius", star.radius.toFixed(2));
  set("sb-star-mass", star.mass.toFixed(2));
  set("sb-star-lum", L_star(star).toFixed(2));

  // Slider labels
  set("sb-radius-val",   state.radius.toFixed(2));
  set("sb-mass-val",     state.mass.toFixed(2));
  set("sb-distance-val", state.distance.toFixed(2));

  // Derived stats
  set("sb-teq",   `${Math.round(planet.pl_eqt)} K`);
  set("sb-grav",  `${gravity(state.mass, state.radius).toFixed(2)} g⊕`);
  set("sb-insol", `${planet.pl_insol >= 100
    ? planet.pl_insol.toFixed(0)
    : planet.pl_insol.toFixed(2)} S⊕`);
  set("sb-period", planet.pl_orbper >= 365.25 * 5
    ? `${(planet.pl_orbper / 365.25).toFixed(1)} years`
    : `${planet.pl_orbper.toFixed(1)} d`);

  set("sb-hz-inner", hz.inner.toFixed(2));
  set("sb-hz-outer", hz.outer.toFixed(2));

  // HZ verdict
  let txt, klass;
  if (state.distance < hz.inner) {
    const f = state.distance / hz.inner;
    txt = `Inside the inner habitable edge (${(f * 100).toFixed(0)} % of HZ inner). Liquid water would boil off — runaway greenhouse like Venus.`;
    klass = "hz-hot";
  } else if (state.distance > hz.outer) {
    const f = state.distance / hz.outer;
    txt = `Beyond the outer habitable edge (${f.toFixed(2)}× HZ outer). Water would freeze over — frozen world like Mars.`;
    klass = "hz-cold";
  } else {
    txt = `Inside the habitable zone (${hz.inner.toFixed(2)} – ${hz.outer.toFixed(2)} au). Liquid water possible at the surface.`;
    klass = "hz-ok";
  }
  const hzEl = document.getElementById("sb-hz-status");
  if (hzEl) { hzEl.textContent = txt; hzEl.className = `sb-hz-status ${klass}`; }

  // Planet preview
  drawPlanetPreview(planet);

  // ESI gauge + breakdown (reuse existing renderers)
  renderGauge("#sb-gauge", planet);
  renderBreakdown("#sb-breakdown", planet);

  // Tell the scatter to draw the ghost dot
  bus.emit("sandbox-changed", planet);
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── BUILD CONTROLS ───────────────────────────────────────────────────────────
function buildHTML(root) {
  root.innerHTML = `
    <div id="sandbox-layout">
      <div class="sandbox-controls">
        <div class="sb-group">
          <h3>Host star</h3>
          <label class="sb-star-row">
            <span>Spectral type</span>
            <select id="sb-star">
              ${Object.entries(STARS).map(([key, s]) =>
                `<option value="${key}" ${key === state.starKey ? "selected" : ""}>${s.label}</option>`
              ).join("")}
            </select>
          </label>
          <div class="sb-star-stats">
            <div><span>T<sub>eff</sub></span><strong><span id="sb-star-teff">5778</span> K</strong></div>
            <div><span>R★</span><strong><span id="sb-star-radius">1.00</span> R☉</strong></div>
            <div><span>M★</span><strong><span id="sb-star-mass">1.00</span> M☉</strong></div>
            <div><span>L★</span><strong><span id="sb-star-lum">1.00</span> L☉</strong></div>
          </div>
        </div>

        <div class="sb-group">
          <h3>Planet body</h3>
          <div class="sb-slider-row">
            <label>Radius <strong><span id="sb-radius-val">1.00</span> R⊕</strong></label>
            <input type="range" id="sb-radius" min="0.3" max="15" step="0.05" value="1.0">
            <div class="sb-slider-hints"><span>0.3</span><span>1</span><span>4</span><span>15</span></div>
          </div>
          <div class="sb-slider-row">
            <label>Mass <strong><span id="sb-mass-val">1.00</span> M⊕</strong></label>
            <input type="range" id="sb-mass" min="0.1" max="500" step="0.1" value="1.0">
            <div class="sb-slider-hints"><span>0.1</span><span>1</span><span>50</span><span>500</span></div>
          </div>
        </div>

        <div class="sb-group">
          <h3>Orbit</h3>
          <div class="sb-slider-row">
            <label>Distance from star <strong><span id="sb-distance-val">1.00</span> au</strong></label>
            <input type="range" id="sb-distance" min="0.02" max="5" step="0.01" value="1.0">
            <div class="sb-slider-hints"><span>0.02</span><span>1</span><span>3</span><span>5</span></div>
          </div>
          <div class="sb-hz-bounds">
            HZ for this star:
            <strong><span id="sb-hz-inner">0.95</span> – <span id="sb-hz-outer">1.67</span> au</strong>
          </div>
        </div>

        <div class="sb-presets">
          <span>Presets:</span>
          <button data-preset="earth">Earth</button>
          <button data-preset="venus">Venus</button>
          <button data-preset="mars">Mars</button>
          <button data-preset="trappist1e">TRAPPIST-1e</button>
          <button data-preset="hotjupiter">Hot Jupiter</button>
        </div>
      </div>

      <div class="sandbox-outputs">
        <div class="sb-preview-row">
          <div class="sb-planet-preview">
            <svg id="sb-planet-svg"></svg>
            <div class="sb-planet-label">Your planet</div>
          </div>
          <div class="sb-derived">
            <div class="sb-derived-row">
              <span>Equilibrium temperature</span>
              <strong id="sb-teq">255 K</strong>
            </div>
            <div class="sb-derived-row">
              <span>Surface gravity</span>
              <strong id="sb-grav">1.00 g⊕</strong>
            </div>
            <div class="sb-derived-row">
              <span>Insolation flux</span>
              <strong id="sb-insol">1.00 S⊕</strong>
            </div>
            <div class="sb-derived-row">
              <span>Orbital period</span>
              <strong id="sb-period">365.2 d</strong>
            </div>
          </div>
        </div>

        <div id="sb-hz-status" class="sb-hz-status hz-ok"></div>

        <div id="sb-gauge" class="esi-gauge"></div>
        <div id="sb-breakdown" class="esi-breakdown"></div>

        <button id="sb-show-scatter" class="sb-show-btn">
          ↑ See where your planet lands on the catalog
        </button>
      </div>
    </div>
  `;
}

// ── PRESETS ──────────────────────────────────────────────────────────────────
const PRESETS = {
  earth:      { star: "G", radius: 1.00, mass: 1.0,  distance: 1.00 },
  venus:      { star: "G", radius: 0.95, mass: 0.82, distance: 0.72 },
  mars:       { star: "G", radius: 0.53, mass: 0.11, distance: 1.52 },
  trappist1e: { star: "M", radius: 0.92, mass: 0.69, distance: 0.029 },
  hotjupiter: { star: "G", radius: 11.5, mass: 318,  distance: 0.05 },
};

function applyPreset(p) {
  state.starKey  = p.star;
  state.radius   = p.radius;
  state.mass     = p.mass;
  state.distance = p.distance;
  // Sync DOM controls
  document.getElementById("sb-star").value     = state.starKey;
  document.getElementById("sb-radius").value   = state.radius;
  document.getElementById("sb-mass").value     = state.mass;
  document.getElementById("sb-distance").value = state.distance;
  update();
}

// ── INIT ─────────────────────────────────────────────────────────────────────
export function initSandbox(selector) {
  const root = document.querySelector(selector);
  if (!root) return;

  try {
    buildHTML(root);

    document.getElementById("sb-star")
      ?.addEventListener("change", e => { state.starKey = e.target.value; safeUpdate(); });
    document.getElementById("sb-radius")
      ?.addEventListener("input",  e => { state.radius = +e.target.value; safeUpdate(); });
    document.getElementById("sb-mass")
      ?.addEventListener("input",  e => { state.mass = +e.target.value;   safeUpdate(); });
    document.getElementById("sb-distance")
      ?.addEventListener("input",  e => { state.distance = +e.target.value; safeUpdate(); });

    document.querySelectorAll(".sb-presets button[data-preset]")
      .forEach(btn => btn.addEventListener("click", () => {
        const p = PRESETS[btn.getAttribute("data-preset")];
        if (p) applyPreset(p);
      }));

    document.getElementById("sb-show-scatter")
      ?.addEventListener("click", () => {
        document.getElementById("explorer-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

    safeUpdate();
  } catch (err) {
    console.error("[sandbox] init failed:", err);
    root.innerHTML = `
      <div style="border:1px solid #c45a7a; background:rgba(196,90,122,0.1);
                  padding:1rem 1.2rem; border-radius:8px; color:#f0a0b0;
                  font-family:monospace; font-size:0.85rem;">
        <strong>Sandbox failed to load:</strong><br>
        ${err.message}<br>
        <em style="opacity:0.7">Check the browser console for the full stack trace.</em>
      </div>`;
  }
}

function safeUpdate() {
  try { update(); }
  catch (err) {
    console.error("[sandbox] update failed:", err);
    const banner = document.getElementById("sb-hz-status");
    if (banner) {
      banner.textContent = `Render error: ${err.message}`;
      banner.className = "sb-hz-status hz-hot";
    }
  }
}
