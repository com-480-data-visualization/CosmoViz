// narrative.js — scrollytelling entry (View 1)
// Martini-glass structure: author-driven scroll → free explorer
// Uses Scrollama for step detection + D3 for the sticky scatter preview.

import { corePlanets }              from "./data.js";
import { SIZE_COLORS, EARTH_COLOR, EARTH_STROKE } from "./legend.js";
import { EARTH }                    from "./state.js";

// ── DIMENSIONS ────────────────────────────────────────────────────────────────
const M = { top: 40, right: 50, bottom: 60, left: 70 };
let W, H, svg, plotArea, xScale, yScale, circles;

// ── SCALES (same domain as scatter for visual continuity) ─────────────────────
function buildScales(w, h) {
  xScale = d3.scaleSymlog().domain([100, 4000]).constant(200).range([0, w]);
  yScale = d3.scaleSymlog().domain([0.5, 26]).constant(1).range([h, 0]);
}

// ── STATIC ANNOTATIONS ───────────────────────────────────────────────────────
function addAnnotations(g, w, h) {
  // HZ band
  g.append("rect").attr("class", "hz-band")
    .attr("x", xScale(200))
    .attr("width", xScale(320) - xScale(200))
    .attr("y", 0).attr("height", h)
    .attr("fill", "#3a9e6e").attr("opacity", 0.07);

  // Fulton gap
  g.append("line").attr("class", "annotation-line")
    .attr("x1", 0).attr("x2", w)
    .attr("y1", yScale(1.8)).attr("y2", yScale(1.8))
    .attr("stroke", "#666").attr("stroke-dasharray", "5 3")
    .attr("stroke-width", 1);
  g.append("text").attr("class", "annotation-text")
    .attr("x", w - 4).attr("y", yScale(1.8) - 5)
    .attr("text-anchor", "end")
    .text("Radius gap ~1.8 R⊕");
}

// ── EARTH MARKER ─────────────────────────────────────────────────────────────
let earthG;
function showEarthMarker() {
  if (earthG) { earthG.style("display", null); return; }
  earthG = plotArea.append("g").attr("class", "earth-ref")
    .attr("transform", `translate(${xScale(255)},${yScale(1.0)})`);
  earthG.append("rect")
    .attr("x", -6).attr("y", -6).attr("width", 12).attr("height", 12)
    .attr("transform", "rotate(45)")
    .attr("fill", EARTH_COLOR)
    .attr("stroke", EARTH_STROKE)
    .attr("stroke-width", 2);
  earthG.append("text")
    .attr("x", 10).attr("y", 4)
    .attr("class", "earth-label")
    .text("Earth");
}

// ── TESS HORIZON LINE ─────────────────────────────────────────────────────────
// (shows in the bias view but we reuse the same scatter for step 3)
let tessLine, earthBox;
function showTESSElements() {
  // We switch axes to period×radius for step 3 — kept simple here:
  // just draw the Earth-analog box on the temperature axis as a callout
  if (earthBox) return;
  earthBox = plotArea.append("rect").attr("class", "earth-analog-box")
    .attr("x", xScale(200))
    .attr("width", xScale(320) - xScale(200))
    .attr("y", yScale(1.5))
    .attr("height", yScale(0.8) - yScale(1.5))
    .attr("fill", "none")
    .attr("stroke", EARTH_STROKE)
    .attr("stroke-dasharray", "5 3")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0);
  earthBox.transition().duration(600).attr("opacity", 1);
}

// ── NARRATIVE TEXT HELPERS ────────────────────────────────────────────────────
function setNarrativeCounter(count, label) {
  const el = document.getElementById("narrative-counter");
  if (!el) return;
  if (count === null) { el.textContent = ""; return; }
  el.innerHTML = `<span class="counter-number">${count}</span><span class="counter-label"> ${label}</span>`;
}

// ── STEP HANDLER ──────────────────────────────────────────────────────────────
function updateStep(index) {
  if (!circles) return;

  const step = +index;

  if (step === 0) {
    circles.transition().duration(600)
      .attr("fill", "#4a4a6a")
      .attr("opacity", 0.45);
    showEarthMarker();
    setNarrativeCounter(762, "exoplanets confirmed by TESS");
  }

  if (step === 1) {
    circles.transition().duration(600)
      .attr("fill", d => d.size_class === "Rocky" ? SIZE_COLORS["Rocky"] : "#2a2a44")
      .attr("opacity", d => d.size_class === "Rocky" ? 0.9 : 0.15);
    setNarrativeCounter(54, "rocky planets — just 7% of the catalog");
  }

  if (step === 2) {
    circles.transition().duration(600)
      .attr("fill", d => d.size_class === "Sub-Neptune" ? SIZE_COLORS["Sub-Neptune"] : "#2a2a44")
      .attr("opacity", d => d.size_class === "Sub-Neptune" ? 0.88 : 0.12);
    setNarrativeCounter(259, "sub-Neptunes — the most common type, with no Solar System analog");
  }

  if (step === 3) {
    // Color all by size class, surface the detection bias message
    circles.transition().duration(800)
      .attr("fill", d => SIZE_COLORS[d.size_class] || "#666")
      .attr("opacity", 0.7);
    showTESSElements();
    setNarrativeCounter(1, "planet with an Earth-length orbital year (> 300 days)");
  }

  if (step === 4) {
    circles.transition().duration(600)
      .attr("fill", d => SIZE_COLORS[d.size_class] || "#666")
      .attr("opacity", 0.55);
    setNarrativeCounter(null, "");
    // Show the enter-explorer button
    d3.select("#explorer-entry-btn").style("display", "inline-block");
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initNarrative() {
  const container = document.getElementById("narrative-scatter");
  if (!container) return;

  const totalW = container.clientWidth  || 700;
  const totalH = container.clientHeight || 450;
  W = totalW  - M.left - M.right;
  H = totalH  - M.top  - M.bottom;

  buildScales(W, H);

  svg = d3.select("#narrative-scatter")
    .attr("width",  totalW)
    .attr("height", totalH);

  plotArea = svg.append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  // Axes
  plotArea.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(xScale).tickValues([100, 200, 400, 800, 1600, 3200])
      .tickFormat(d => `${d} K`));

  plotArea.append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(yScale).tickValues([0.5, 1, 2, 4, 8, 16, 24])
      .tickFormat(d => `${d} R⊕`));

  svg.append("text").attr("class", "axis-label")
    .attr("x", M.left + W / 2).attr("y", totalH - 6)
    .attr("text-anchor", "middle")
    .text("Equilibrium temperature (K, log scale)");

  svg.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(M.top + H / 2)).attr("y", 14)
    .attr("text-anchor", "middle")
    .text("Planet radius (R⊕, log scale)");

  addAnnotations(plotArea, W, H);

  // Planet circles — sorted largest→smallest so small ones render on top
  const sorted = [...corePlanets].sort((a, b) => b.pl_rade - a.pl_rade);
  circles = plotArea.selectAll("circle.narr-planet")
    .data(sorted, d => d.pl_name)
    .join("circle")
    .attr("class", "narr-planet")
    .attr("cx", d => xScale(d.pl_eqt))
    .attr("cy", d => yScale(d.pl_rade))
    .attr("r", 3)
    .attr("fill", "#4a4a6a")
    .attr("opacity", 0.45);

  // ── Scrollama ────────────────────────────────────────────────────────────
  const scroller = scrollama();
  scroller
    .setup({
      step:   ".narrative-step",
      offset: 0.55,
      debug:  false,
    })
    .onStepEnter(({ index }) => updateStep(index));

  // Trigger step 0 on load
  updateStep(0);
}
