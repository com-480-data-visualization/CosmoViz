// legend.js — color constants and legend renderer
// Imported by every view that needs consistent color encoding.

import { EARTH, setSelected }    from "./state.js";
import { showDetailCard }        from "./tooltip.js";

// ── SIZE CLASS ─────────────────────────────────────────────────────────────
// Categorical hue, colorblind-safe (checked against Coblis deuteranopia sim)
export const SIZE_COLORS = {
  "Rocky":        "#e07b39",   // amber-orange
  "Super-Earth":  "#3a9e6e",   // teal-green
  "Sub-Neptune":  "#4a7ec7",   // mid blue
  "Neptune-like": "#8e6bc4",   // purple
  "Gas Giant":    "#c45a7a",   // rose-coral
  "Unknown":      "#666680",
};

export const SIZE_ORDER = [
  "Rocky", "Super-Earth", "Sub-Neptune", "Neptune-like", "Gas Giant",
];

// ── EARTH REFERENCE ─────────────────────────────────────────────────────────
export const EARTH_COLOR  = "#ffffff";
export const EARTH_STROKE = "#ff4444";

// ── SEQUENTIAL: discovery year (light → dark blue) ──────────────────────────
export const yearColorScale = () =>
  // d3 is loaded globally from CDN; we reference it here lazily
  d3.scaleSequential()
    .domain([2018, 2026])
    .interpolator(d3.interpolateBlues);

// ── SEQUENTIAL: equilibrium temperature (cool → warm) ────────────────────────
// Used exclusively on the sky map (temperature is on the X axis in scatter)
export const tempColorScale = () =>
  d3.scaleSequential()
    .domain([163, 3646])
    .interpolator(d3.interpolateCool);

// ── LEGEND RENDERER ──────────────────────────────────────────────────────────
// Renders into a CSS selector string (e.g. "#legend-container")
export function renderLegend(selector) {
  const container = d3.select(selector);
  container.html(""); // clear any previous

  // ── Planet type ──
  const typeSection = container.append("div").attr("class", "legend-section");
  typeSection.append("div").attr("class", "legend-title").text("Planet type");

  SIZE_ORDER.forEach(cls => {
    const row = typeSection.append("div").attr("class", "legend-row");
    row.append("svg")
      .attr("width", 14).attr("height", 14)
      .append("circle")
        .attr("cx", 7).attr("cy", 7).attr("r", 5)
        .attr("fill", SIZE_COLORS[cls]);
    row.append("span").text(cls);
  });

  // ── Earth reference (clickable) ──
  const earthRow = container.append("div")
    .attr("class", "legend-section")
    .append("div").attr("class", "legend-row earth-row")
    .attr("title", "View Earth's data + comparison")
    .on("click", () => {
      setSelected(EARTH);
      showDetailCard(EARTH, { scrollIntoView: true });
    });

  const earthSvg = earthRow.append("svg").attr("width", 14).attr("height", 14);
  earthSvg.append("rect")
    .attr("x", 2).attr("y", 2).attr("width", 10).attr("height", 10)
    .attr("transform", "rotate(45,7,7)")
    .attr("fill", EARTH_COLOR)
    .attr("stroke", EARTH_STROKE)
    .attr("stroke-width", 1.5);
  earthRow.append("span").text("Earth (reference)");
  earthRow.append("span").attr("class", "earth-row-hint").text(" ↗");

  // ── Mass unknown indicator ──
  const noMassSection = container.append("div").attr("class", "legend-section");
  const noMassRow = noMassSection.append("div").attr("class", "legend-row");
  const noMassSvg = noMassRow.append("svg").attr("width", 14).attr("height", 14);
  noMassSvg.append("circle")
    .attr("cx", 7).attr("cy", 7).attr("r", 5)
    .attr("fill", "none")
    .attr("stroke", "#888")
    .attr("stroke-width", 1.5);
  noMassRow.append("span").text("Mass not measured");

  // ── Circle size note ──
  const sizeNote = container.append("div")
    .attr("class", "legend-section legend-note");
  sizeNote.append("div").attr("class", "legend-title").text("Circle size");
  sizeNote.append("span").text("∝ planet mass (log scale)");
}
