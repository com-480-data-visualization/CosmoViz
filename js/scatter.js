// scatter.js — View 2: Planet Explorer scatter (pl_eqt × pl_rade)
// Both axes are LOG scale — justified by 3-4 orders of magnitude range.

import { corePlanets, filteredPlanets }          from "./data.js";
import { SIZE_COLORS, EARTH_COLOR, EARTH_STROKE } from "./legend.js";
import { bus, setHovered, setSelected, selectedPlanet, EARTH, earthCriteria } from "./state.js";
import { showTooltip, moveTooltip, hideTooltip, showDetailCard } from "./tooltip.js";

// Wire Earth marker hover + click — opens the comparison view with Earth.
function wireEarthMarker(g) {
  g.style("cursor", "pointer")
    .on("mouseover", (event) => { setHovered(EARTH); showTooltip(event, EARTH); })
    .on("mousemove",  (event) => moveTooltip(event))
    .on("mouseout",   ()      => { setHovered(null); hideTooltip(); })
    .on("click",     (event)  => {
      event.stopPropagation();
      setSelected(EARTH);
      showDetailCard(EARTH);
    });
}

const M = { top: 30, right: 30, bottom: 70, left: 80 };
let W, H, svg, plotArea, xScale, yScale;

// ── PLANET RADIUS → VISUAL RADIUS ────────────────────────────────────────────
function vizRadius(d) {
  if (d.pl_bmasse == null) return 4;
  return 3 + Math.log10(Math.max(d.pl_bmasse, 1)) * 2;
}

// ── RENDER PLANETS ────────────────────────────────────────────────────────────
function renderPlanets(data) {
  if (!plotArea) return;

  // Sort largest → smallest so small planets render on top
  const sorted = [...data]
    .filter(d => d.pl_eqt != null && d.pl_rade != null)
    .sort((a, b) => b.pl_rade - a.pl_rade);

  const circles = plotArea.selectAll("circle.planet")
    .data(sorted, d => d.pl_name);

  // EXIT
  circles.exit()
    .transition().duration(300)
    .attr("r", 0).attr("opacity", 0)
    .remove();

  // ENTER + UPDATE
  circles.enter()
    .append("circle")
    .attr("class", "planet")
    .attr("cx", d => xScale(d.pl_eqt))
    .attr("cy", d => yScale(d.pl_rade))
    .attr("r", 0)
    .attr("opacity", 0)
    .merge(circles)
    .on("mouseover", (event, d) => {
      setHovered(d);
      showTooltip(event, d);
    })
    .on("mousemove", (event) => moveTooltip(event))
    .on("mouseout", () => {
      setHovered(null);
      hideTooltip();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      const next = d === selectedPlanet ? null : d;
      setSelected(next);
      showDetailCard(next);
    })
    .style("pointer-events", "all")
    .transition().duration(400)
    .attr("cx", d => xScale(d.pl_eqt))
    .attr("cy", d => yScale(d.pl_rade))
    .attr("r", d => vizRadius(d))
    .attr("fill", d =>
      d.pl_bmasse == null ? "none" : (SIZE_COLORS[d.size_class] || "#999")
    )
    .attr("stroke", d => {
      if (d === selectedPlanet) return "#fff";
      return d.pl_bmasse == null
        ? (SIZE_COLORS[d.size_class] || "#999")
        : "rgba(255,255,255,0.15)";
    })
    .attr("stroke-width", d => d === selectedPlanet ? 2.2 : 1.5)
    .attr("opacity", 0.8);

  updateCounter(data.length);
}

// ── HIGHLIGHT EARTH-LIKE (from sliders) ───────────────────────────────────────
function highlightEarthLike(names) {
  const nameSet = new Set(names);
  plotArea?.selectAll("circle.planet")
    .attr("opacity", d => {
      if (names.length === 0) return 0.8;
      return nameSet.has(d.pl_name) ? 1.0 : 0.18;
    })
    .attr("stroke", d =>
      nameSet.has(d.pl_name) ? EARTH_STROKE : "rgba(255,255,255,0.1)"
    )
    .attr("stroke-width", d => nameSet.has(d.pl_name) ? 2 : 1.5);
}

// ── PLANET COUNT DISPLAY ──────────────────────────────────────────────────────
function updateCounter(n) {
  const el = document.getElementById("count-number");
  if (el) el.textContent = n ?? "—";
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initScatter(selector) {
  const containerEl = document.querySelector(selector);
  if (!containerEl) return;

  const totalW = containerEl.clientWidth  || 800;
  const totalH = Math.min(520, totalW * 0.65);
  W = totalW  - M.left - M.right;
  H = totalH  - M.top  - M.bottom;

  xScale = d3.scaleSymlog().domain([100, 4000]).constant(200).range([0, W]);
  yScale = d3.scaleSymlog().domain([0.5, 26]).constant(1).range([H, 0]);

  svg = d3.select(selector).append("svg")
    .attr("id", "scatter-svg")
    .attr("width", totalW).attr("height", totalH);

  plotArea = svg.append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  // ── Habitable zone band ──────────────────────────────────────────────────
  plotArea.append("rect").attr("class", "hz-band")
    .attr("x", xScale(200))
    .attr("width", xScale(320) - xScale(200))
    .attr("y", 0).attr("height", H)
    .attr("fill", "#3a9e6e").attr("opacity", 0.07);

  plotArea.append("text").attr("class", "annotation-text hz-label")
    .attr("x", (xScale(200) + xScale(320)) / 2)
    .attr("y", 13)
    .attr("text-anchor", "middle")
    .text("HZ (G star)");

  // ── Fulton radius gap ────────────────────────────────────────────────────
  plotArea.append("line").attr("class", "annotation-line")
    .attr("x1", 0).attr("x2", W)
    .attr("y1", yScale(1.8)).attr("y2", yScale(1.8))
    .attr("stroke", "#555").attr("stroke-dasharray", "6 3").attr("stroke-width", 1);

  plotArea.append("text").attr("class", "annotation-text")
    .attr("x", W - 4).attr("y", yScale(1.8) - 5)
    .attr("text-anchor", "end")
    .text("Fulton radius gap ~1.8 R⊕");

  // ── Axes ─────────────────────────────────────────────────────────────────
  plotArea.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(xScale).tickValues([100, 200, 400, 800, 1600, 3200])
      .tickFormat(d => `${d} K`));

  plotArea.append("g").attr("class", "axis y-axis")
    .call(d3.axisLeft(yScale).tickValues([0.5, 1, 2, 4, 8, 16, 24])
      .tickFormat(d => `${d} R⊕`));

  svg.append("text").attr("class", "axis-label")
    .attr("x", M.left + W / 2).attr("y", totalH - 8)
    .attr("text-anchor", "middle")
    .text("Equilibrium temperature (K) — log scale");

  svg.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(M.top + H / 2)).attr("y", 16)
    .attr("text-anchor", "middle")
    .text("Planet radius (R⊕) — log scale");

  // ── Earth reference marker (clickable) ───────────────────────────────────
  const earthG = plotArea.append("g").attr("class", "earth-ref earth-clickable")
    .attr("transform", `translate(${xScale(255)},${yScale(1.0)})`);

  // Larger invisible hit area behind the diamond so the click target is generous
  earthG.append("circle")
    .attr("r", 12)
    .attr("fill", "transparent")
    .style("pointer-events", "all");

  earthG.append("rect")
    .attr("x", -6).attr("y", -6).attr("width", 12).attr("height", 12)
    .attr("transform", "rotate(45)")
    .attr("fill", EARTH_COLOR)
    .attr("stroke", EARTH_STROKE)
    .attr("stroke-width", 2);

  earthG.append("text").attr("class", "earth-label")
    .attr("x", 10).attr("y", 4)
    .text("Earth");

  wireEarthMarker(earthG);

  // ── Earth-like criteria rectangle (live overlay) ─────────────────────────
  // Updates whenever the sliders move so the user *sees* their constraints.
  const critRect = plotArea.append("rect")
    .attr("class", "criteria-rect")
    .attr("fill", "rgba(74, 197, 214, 0.06)")
    .attr("stroke", "rgba(74, 197, 214, 0.55)")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4 3")
    .attr("pointer-events", "none")
    .attr("opacity", 0);

  function updateCriteriaRect() {
    const { radius, temp } = earthCriteria;
    const x1 = xScale(temp.min), x2 = xScale(temp.max);
    const y1 = yScale(radius.max), y2 = yScale(radius.min);
    critRect
      .attr("x", x1).attr("y", y1)
      .attr("width",  Math.max(0, x2 - x1))
      .attr("height", Math.max(0, y2 - y1))
      .attr("opacity", 1);
  }

  // ── Empty-state message ───────────────────────────────────────────────────
  plotArea.append("text").attr("id", "scatter-empty-msg")
    .attr("x", W / 2).attr("y", H / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "#666")
    .style("display", "none")
    .text("No planets match the current criteria. Try widening the sliders.");

  // ── Click on background clears selection ─────────────────────────────────
  svg.on("click", () => { setSelected(null); showDetailCard(null); });

  // ── Bus listeners ─────────────────────────────────────────────────────────
  bus.on("planet-hovered", planet => {
    plotArea.selectAll("circle.planet")
      .attr("opacity", d => {
        if (!planet) return 0.8;
        return d.pl_name === planet.pl_name ? 1.0 : 0.18;
      })
      .attr("r", d => {
        const base = vizRadius(d);
        return (planet && d.pl_name === planet.pl_name) ? base * 1.6 : base;
      });
  });

  bus.on("filter-changed", () => {
    const data = filteredPlanets();
    renderPlanets(data);
    const emptyMsg = document.getElementById("scatter-empty-msg");
    if (emptyMsg) emptyMsg.style.display = data.length === 0 ? null : "none";
  });

  bus.on("earth-like-highlight", names => {
    updateCriteriaRect();
    highlightEarthLike(names);
  });

  // Initial paint of the rect at default criteria
  updateCriteriaRect();

  // Ghost marker fed by the sandbox section — shows where the user's
  // hypothetical planet would land in the catalog's temperature × radius space.
  let ghostG = null;
  bus.on("sandbox-changed", planet => {
    if (!plotArea || !planet) return;
    const isEarthLike =
    Math.abs(planet.pl_eqt - EARTH.pl_eqt) < 1 &&
    Math.abs(planet.pl_rade - EARTH.pl_rade) < 0.01;

    if (isEarthLike) {
      if (ghostG) ghostG.attr("display", "none");
      return;
    }

    if (ghostG) ghostG.attr("display", null);
    if (!ghostG) {
      ghostG = plotArea.append("g")
        .attr("class", "ghost-marker")
        .style("pointer-events", "none");
      ghostG.append("circle")
        .attr("class", "ghost-halo")
        .attr("r", 14)
        .attr("fill", "none")
        .attr("stroke", "#ff79c6")
        .attr("stroke-width", 1)
        .attr("opacity", 0.4);
      ghostG.append("circle")
        .attr("class", "ghost-dot")
        .attr("r", 7)
        .attr("fill", "none")
        .attr("stroke", "#ff79c6")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3 2.5");
      ghostG.append("text")
        .attr("class", "ghost-label")
        .attr("x", 12).attr("y", 4)
        .text("Your planet");
    }
    // Clamp into visible range so the marker never disappears off-axis
    const [tMin, tMax] = xScale.domain();
    const [rMin, rMax] = yScale.domain();
    const teq = Math.max(tMin, Math.min(tMax, planet.pl_eqt));
    const r   = Math.max(rMin, Math.min(rMax, planet.pl_rade));
    const offT = planet.pl_eqt < tMin || planet.pl_eqt > tMax;
    const offR = planet.pl_rade < rMin || planet.pl_rade > rMax;

    ghostG.attr("transform", `translate(${xScale(teq)},${yScale(r)})`)
      .attr("opacity", (offT || offR) ? 0.4 : 1);
  });

  // ── Resize ────────────────────────────────────────────────────────────────
  window.addEventListener("resize", () => {
    const newW = containerEl.clientWidth;
    if (Math.abs(newW - (W + M.left + M.right)) < 20) return; // debounce
    // Full re-init on resize
    d3.select(selector).select("svg").remove();
    initScatter(selector);
  });

  // Initial render
  renderPlanets(filteredPlanets());
}
