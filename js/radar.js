// radar.js — Spider / radar chart comparing exoplanets to Earth
//
// Transform: stat = 50 + 50 * log10(x / x_earth)
//   → Earth sits at 50 on every axis (a regular pentagon).
//   → Values are clipped to [0, 100] for visual stability.
//   → Out-of-range values are drawn at the boundary with a small marker.

import { EARTH } from "./state.js";

// ── AXIS CONFIG ───────────────────────────────────────────────────────────────
// Order matters: it sets the angular position of each axis.
const AXES = [
  { key: "pl_rade",   label: "Radius",     unit: "R⊕", earth: 1.0    },
  { key: "pl_bmasse", label: "Mass",       unit: "M⊕", earth: 1.0    },
  { key: "pl_eqt",    label: "Temperature",unit: "K",  earth: 255    },
  { key: "pl_orbper", label: "Period",     unit: "d",  earth: 365.25 },
  { key: "pl_insol",  label: "Insolation", unit: "S⊕", earth: 1.0    },
];

// ── COLOR PALETTE ─────────────────────────────────────────────────────────────
export const RADAR_COLORS = {
  earth:    "#ffffff",
  selected: "#4a7ec7",
  pins:     ["#e07b39", "#3a9e6e", "#c45a7a", "#8e6bc4"],
};

// ── TRANSFORM ─────────────────────────────────────────────────────────────────
function rawStat(value, earthValue) {
  if (value == null || value <= 0) return null;
  return 50 + 50 * Math.log10(value / earthValue);
}

function clip(v) {
  if (v == null) return null;
  return Math.max(0, Math.min(100, v));
}

// ── GEOMETRY ──────────────────────────────────────────────────────────────────
// Angles start at -90° (top) and go clockwise, evenly spaced.
function axisAngle(i, n) {
  return (-Math.PI / 2) + (2 * Math.PI * i) / n;
}

function polarToXY(angle, r) {
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

// ── CORE RENDER ───────────────────────────────────────────────────────────────
/**
 * Render the radar chart into a container.
 * @param {string|Element} selector  CSS selector or DOM element
 * @param {object[]} planets         List of planet objects to overlay (in addition to Earth)
 */
export function renderRadar(selector, planets) {
  const container = typeof selector === "string"
    ? document.querySelector(selector) : selector;
  if (!container) return;

  container.innerHTML = "";

  const W = container.clientWidth  || 360;
  const H = container.clientHeight || 340;
  const cx = W / 2;
  const cy = H / 2 + 4;           // small vertical bias for label room above
  const R  = Math.min(cx, cy) - 56;

  const svg = d3.select(container).append("svg")
    .attr("class", "radar-svg")
    .attr("width",  W)
    .attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`);

  const root = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  // ── Concentric gridlines (every 25%) ─────────────────────────────────────
  const levels = [25, 50, 75, 100];
  levels.forEach(level => {
    const pts = AXES.map((_, i) => polarToXY(axisAngle(i, AXES.length), R * level / 100));
    root.append("polygon")
      .attr("class", "radar-grid")
      .attr("points", pts.map(p => p.join(",")).join(" "))
      .attr("fill", "none")
      .attr("stroke", level === 50 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)")
      .attr("stroke-width", level === 50 ? 1 : 0.7)
      .attr("stroke-dasharray", level === 50 ? "" : "2 3");
  });

  // ── Axis spokes + labels ─────────────────────────────────────────────────
  AXES.forEach((axis, i) => {
    const a = axisAngle(i, AXES.length);
    const [x, y] = polarToXY(a, R);

    // Spoke
    root.append("line")
      .attr("class", "radar-spoke")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", x).attr("y2", y)
      .attr("stroke", "rgba(255,255,255,0.10)")
      .attr("stroke-width", 0.8);

    // Label position — push outward, tweak text-anchor by angle
    const [lx, ly] = polarToXY(a, R + 22);
    const anchor =
      Math.abs(Math.cos(a)) < 0.25 ? "middle"
      : Math.cos(a) > 0 ? "start" : "end";

    const labelG = root.append("g")
      .attr("transform", `translate(${lx},${ly})`);

    labelG.append("text")
      .attr("class", "radar-axis-label")
      .attr("text-anchor", anchor)
      .attr("dy", "0.32em")
      .text(axis.label);

    labelG.append("text")
      .attr("class", "radar-axis-earth")
      .attr("text-anchor", anchor)
      .attr("dy", "1.5em")
      .text(`E: ${formatEarth(axis)}`);
  });

  // ── Tick value at the 50% ring (Earth reference) ─────────────────────────
  root.append("text")
    .attr("class", "radar-earth-tick")
    .attr("x", 4).attr("y", -R * 0.5 - 4)
    .text("Earth ×1");

  // ── Build the layer model ────────────────────────────────────────────────
  // The first non-Earth planet (or Earth itself if planets[0] is Earth) is the
  // "primary" — the planet currently being viewed in the detail card. It gets
  // the accent color and the strongest visual weight. Other planets are
  // "pinned overlays" with palette colors.
  const isEarthPrimary = planets[0]?.isEarth === true;
  const nonEarth = planets.filter(p => p && !p.isEarth);
  const currentPlanet = isEarthPrimary ? null : (nonEarth[0] || null);
  const pinnedOnly    = isEarthPrimary ? nonEarth : nonEarth.slice(1);

  const earthLayer = {
    planet: EARTH,
    color: RADAR_COLORS.earth,
    isEarth: true,
    isPrimary: isEarthPrimary,
  };
  const pinLayers = pinnedOnly.map((p, i) => ({
    planet: p,
    color: RADAR_COLORS.pins[i % RADAR_COLORS.pins.length],
    isEarth: false,
    isPrimary: false,
  }));
  const primaryLayer = currentPlanet ? {
    planet: currentPlanet,
    color: RADAR_COLORS.selected,
    isEarth: false,
    isPrimary: true,
  } : null;

  // Render order (z-axis): Earth bottom → pins → primary on top so it never
  // gets visually buried by the overlays.
  const renderQueue = [earthLayer, ...pinLayers];
  if (primaryLayer) renderQueue.push(primaryLayer);

  renderQueue.forEach(layer => {
    const isEarth = !!layer.isEarth;
    const planet  = layer.planet;
    const primary = !!layer.isPrimary;

    const pts = AXES.map((axis, i) => {
      const raw = rawStat(planet[axis.key], axis.earth);
      const v   = clip(raw);
      if (v == null) return null;
      const a = axisAngle(i, AXES.length);
      const [x, y] = polarToXY(a, R * v / 100);
      return { x, y, raw, axis };
    });

    // Closed polygon — missing axes collapse to the origin (visible indicator
    // that a value is unmeasured).
    const polyPts = pts.map(p => p ? `${p.x},${p.y}` : "0,0").join(" ");

    // Visual weights — primary stands out, pinned overlays stay quieter so
    // the radar reads as "current vs. comparisons".
    const fillOpacity = isEarth
      ? (primary ? 0.20 : 0.08)
      : (primary ? 0.30 : 0.12);
    const strokeWidth = isEarth
      ? (primary ? 2.6 : 1.4)
      : (primary ? 2.8 : 1.6);
    const dash = (isEarth && !primary) ? "3 3" : "";

    root.append("polygon")
      .attr("class", `radar-polygon${isEarth ? " radar-earth" : ""}${primary ? " radar-primary" : ""}`)
      .attr("points", polyPts)
      .attr("fill", layer.color)
      .attr("fill-opacity", fillOpacity)
      .attr("stroke", layer.color)
      .attr("stroke-width", strokeWidth)
      .attr("stroke-dasharray", dash)
      .attr("stroke-linejoin", "round");

    // Vertex markers
    pts.forEach(p => {
      if (!p) return;
      const outOfRange = (p.raw < 0 || p.raw > 100);
      root.append("circle")
        .attr("class", "radar-vertex")
        .attr("cx", p.x).attr("cy", p.y)
        .attr("r", outOfRange ? 4.5 : (primary ? 3.8 : 3.0))
        .attr("fill", outOfRange ? "transparent" : layer.color)
        .attr("stroke", layer.color)
        .attr("stroke-width", outOfRange ? 1.8 : (primary ? 1.4 : 1))
        .attr("opacity", isEarth && !primary ? 0.7 : 1);
    });
  });

  // ── Legend (below the chart) — order: Earth → primary → pins ─────────────
  const legendY = R + 70;
  const legend = svg.append("g")
    .attr("class", "radar-legend")
    .attr("transform", `translate(${cx},${legendY})`);

  const items = [
    { label: "Earth", color: RADAR_COLORS.earth, dash: !isEarthPrimary },
  ];
  if (primaryLayer) {
    items.push({ label: primaryLayer.planet.pl_name, color: primaryLayer.color });
  }
  pinLayers.forEach(l => {
    items.push({ label: l.planet.pl_name, color: l.color });
  });

  let cursorX = 0;
  const gapX = 14;
  const lineH = 16;
  // Pre-measure: rough text width estimate (px per char)
  const charW = 6.3;
  // Wrap if total estimated width > svg width − padding
  const totalEst = items.reduce(
    (s, it) => s + (it.label.length * charW + 24 + gapX), 0
  );
  const wrap = totalEst > (W - 20);

  let row = 0;
  cursorX = 0;
  items.forEach((it) => {
    const w = it.label.length * charW + 22;
    if (wrap && cursorX + w > W - 20) { row += 1; cursorX = 0; }
    const x = cursorX - (W / 2 - 10);

    const g = legend.append("g")
      .attr("transform", `translate(${x},${row * lineH})`);

    g.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", 14).attr("y2", 0)
      .attr("stroke", it.color)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", it.dash ? "3 3" : "");

    g.append("text")
      .attr("class", "radar-legend-text")
      .attr("x", 19).attr("y", 0)
      .attr("dy", "0.35em")
      .text(it.label);

    cursorX += w + gapX;
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatEarth(axis) {
  const v = axis.earth;
  // Compact pretty-print
  if (axis.key === "pl_orbper") return "365 d";
  if (axis.key === "pl_eqt")    return "255 K";
  return `${v} ${axis.unit}`;
}

// ── PUBLIC: helper to compute the per-axis stat values ───────────────────────
// Used elsewhere (habitability score, debug) so the transform stays single-source.
export function computeStats(planet) {
  return AXES.map(axis => ({
    key:   axis.key,
    label: axis.label,
    raw:   planet[axis.key],
    stat:  rawStat(planet[axis.key], axis.earth),
    earth: axis.earth,
  }));
}

export { AXES };
