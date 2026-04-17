// bias.js — View 3: Detection Bias (orbital period × planet radius)
// Narrative: TESS has a ~27-day observability limit.
// Almost nothing with Earth-like period exists in this dataset.

import { corePlanets, filteredPlanets } from "./data.js";
import { SIZE_COLORS, EARTH_COLOR, EARTH_STROKE, yearColorScale } from "./legend.js";
import { bus, setHovered, setSelected, selectedPlanet } from "./state.js";
import { showTooltip, moveTooltip, hideTooltip, showDetailCard } from "./tooltip.js";

const M = { top: 30, right: 50, bottom: 70, left: 80 };
let W, H, svg, plotArea, xScale, yScale, yearScale;
let currentYear = 2026;
let playInterval = null;

// ── RENDER PLANETS ────────────────────────────────────────────────────────────
function renderBias(data, maxYear) {
  if (!plotArea) return;
  const filtered = data.filter(d => d.pl_orbper != null && d.pl_rade != null
    && (maxYear == null || d.disc_year <= maxYear));

  const circles = plotArea.selectAll("circle.bias-planet")
    .data(filtered, d => d.pl_name);

  circles.exit()
    .transition().duration(300)
    .attr("r", 0).attr("opacity", 0)
    .remove();

  circles.enter()
    .append("circle")
    .attr("class", "bias-planet")
    .attr("cx", d => xScale(d.pl_orbper))
    .attr("cy", d => yScale(d.pl_rade))
    .attr("r", 0)
    .attr("opacity", 0)
    .merge(circles)
    .on("mouseover", (event, d) => { setHovered(d); showTooltip(event, d); })
    .on("mousemove", (event) => moveTooltip(event))
    .on("mouseout", () => { setHovered(null); hideTooltip(); })
    .on("click", (event, d) => {
      event.stopPropagation();
      const next = d === selectedPlanet ? null : d;
      setSelected(next);
      showDetailCard(next);
    })
    .transition().duration(500)
    .attr("cx", d => xScale(d.pl_orbper))
    .attr("cy", d => yScale(d.pl_rade))
    .attr("r", 4)
    .attr("fill", d => yearScale ? yearScale(d.disc_year) : "#4a7ec7")
    .attr("opacity", 0.75);

  // Year count display
  const count = filtered.length;
  const el = document.getElementById("planet-year-count");
  if (el) el.textContent = `${count} planet${count !== 1 ? "s" : ""}`;
}

// ── PLAY / PAUSE ──────────────────────────────────────────────────────────────
function startPlay() {
  const btn = document.getElementById("year-play");
  if (btn) btn.textContent = "⏸ Pause";
  currentYear = 2018;
  updateYearUI(currentYear);

  playInterval = setInterval(() => {
    currentYear++;
    updateYearUI(currentYear);
    renderBias(filteredPlanets(), currentYear);
    if (currentYear >= 2026) stopPlay();
  }, 700);
}

function stopPlay() {
  if (playInterval) { clearInterval(playInterval); playInterval = null; }
  const btn = document.getElementById("year-play");
  if (btn) btn.textContent = "▶ Play";
}

function updateYearUI(year) {
  const slider  = document.getElementById("year-slider");
  const display = document.getElementById("year-display");
  if (slider)  slider.value      = year;
  if (display) display.textContent = year;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initBias(selector) {
  const containerEl = document.querySelector(selector);
  if (!containerEl) return;

  yearScale = yearColorScale();

  const totalW = containerEl.clientWidth || 800;
  const totalH = Math.min(480, totalW * 0.6);
  W = totalW - M.left - M.right;
  H = totalH - M.top  - M.bottom;

  // X: orbital period [days], log
  xScale = d3.scaleLog().domain([0.2, 600]).range([0, W]).clamp(true);
  // Y: planet radius [R⊕], log — same domain as scatter for visual continuity
  yScale = d3.scaleLog().domain([0.5, 26]).range([H, 0]).clamp(true);

  svg = d3.select(selector).append("svg")
    .attr("id", "bias-svg")
    .attr("width", totalW).attr("height", totalH);

  plotArea = svg.append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  // ── Axes ──────────────────────────────────────────────────────────────────
  plotArea.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${H})`)
    .call(
      d3.axisBottom(xScale)
        .ticks(7, "~s")
        .tickFormat(d => `${d3.format(".1~f")(d)}d`)
    );

  plotArea.append("g").attr("class", "axis y-axis")
    .call(
      d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => `${d} R⊕`)
    );

  svg.append("text").attr("class", "axis-label")
    .attr("x", M.left + W / 2).attr("y", totalH - 8)
    .attr("text-anchor", "middle")
    .text("Orbital period (days) — log scale");

  svg.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(M.top + H / 2)).attr("y", 16)
    .attr("text-anchor", "middle")
    .text("Planet radius (R⊕) — log scale");

  // ── TESS ~27-day observability limit ─────────────────────────────────────
  plotArea.append("line").attr("class", "annotation-line tess-line")
    .attr("x1", xScale(27)).attr("x2", xScale(27))
    .attr("y1", 0).attr("y2", H)
    .attr("stroke", "#e07b39")
    .attr("stroke-dasharray", "8 4")
    .attr("stroke-width", 1.5);

  plotArea.append("text").attr("class", "annotation-text tess-label")
    .attr("x", xScale(27) + 5).attr("y", 14)
    .attr("fill", "#e07b39")
    .text("TESS ~27-day limit");

  // ── Earth-analog zone box ─────────────────────────────────────────────────
  plotArea.append("rect").attr("class", "earth-analog-box")
    .attr("x", xScale(300))
    .attr("width", xScale(430) - xScale(300))
    .attr("y", yScale(1.25))
    .attr("height", yScale(0.8) - yScale(1.25))
    .attr("fill", EARTH_STROKE).attr("opacity", 0.07)
    .attr("stroke", EARTH_STROKE).attr("stroke-dasharray", "4 2")
    .attr("stroke-width", 1);

  plotArea.append("text").attr("class", "annotation-text earth-box-label")
    .attr("x", xScale(362)).attr("y", yScale(1.25) - 6)
    .attr("text-anchor", "middle")
    .attr("fill", EARTH_STROKE)
    .text("Earth-analog zone");

  // ── Earth marker ──────────────────────────────────────────────────────────
  const earthG = plotArea.append("g").attr("class", "earth-ref")
    .attr("transform", `translate(${xScale(365.25)},${yScale(1.0)})`);

  earthG.append("rect")
    .attr("x", -6).attr("y", -6).attr("width", 12).attr("height", 12)
    .attr("transform", "rotate(45)")
    .attr("fill", EARTH_COLOR).attr("stroke", EARTH_STROKE).attr("stroke-width", 2);

  earthG.append("text").attr("class", "earth-label")
    .attr("x", 10).attr("y", 4).text("Earth");

  // ── Annotate the single >300d planet ──────────────────────────────────────
  const longPeriod = corePlanets.find(d => d.pl_orbper > 300);
  if (longPeriod) {
    const annotG = plotArea.append("g")
      .attr("transform", `translate(${xScale(longPeriod.pl_orbper)},${yScale(longPeriod.pl_rade)})`);
    annotG.append("circle").attr("r", 6).attr("fill", "none")
      .attr("stroke", "#aaa").attr("stroke-width", 1.5);
    annotG.append("text").attr("class", "annotation-text")
      .attr("x", 10).attr("y", 4)
      .text(`${longPeriod.pl_name} (${longPeriod.pl_orbper.toFixed(0)}d)`);
  }

  // ── Year slider controls (DOM already in HTML) ────────────────────────────
  d3.select("#year-slider").on("input", function () {
    stopPlay();
    currentYear = +this.value;
    updateYearUI(currentYear);
    renderBias(filteredPlanets(), currentYear);
  });

  d3.select("#year-play").on("click", function () {
    if (playInterval) { stopPlay(); } else { startPlay(); }
  });

  // ── TESS Earth info panel toggle ──────────────────────────────────────────
  d3.select("#tess-earth-btn").on("click", function () {
    const panel = d3.select("#tess-earth-panel");
    const visible = panel.style("display") !== "none";
    panel.style("display", visible ? "none" : "block");
    this.textContent = visible ? "Would TESS detect Earth?" : "✕ Close";
  });

  // ── Bus listeners ─────────────────────────────────────────────────────────
  bus.on("planet-hovered", planet => {
    plotArea.selectAll("circle.bias-planet")
      .attr("opacity", d => {
        if (!planet) return 0.75;
        return d.pl_name === planet.pl_name ? 1.0 : 0.18;
      })
      .attr("r", d => (planet && d.pl_name === planet.pl_name) ? 7 : 4);
  });

  bus.on("filter-changed", () => renderBias(filteredPlanets(), currentYear));

  // ── Color legend for year ─────────────────────────────────────────────────
  const legendG = svg.append("g")
    .attr("transform", `translate(${M.left + W + 6}, ${M.top})`);
  legendG.append("text").attr("class", "annotation-text")
    .attr("x", 0).attr("y", 0).text("Year");

  const gradId = "year-grad";
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  [2018, 2020, 2022, 2024, 2026].forEach((y, i, arr) => {
    grad.append("stop")
      .attr("offset", `${(i / (arr.length - 1)) * 100}%`)
      .attr("stop-color", yearScale(y));
  });

  legendG.append("rect")
    .attr("x", 0).attr("y", 8)
    .attr("width", 12).attr("height", 120)
    .attr("fill", `url(#${gradId})`);

  [2018, 2022, 2026].forEach((y, i) => {
    legendG.append("text").attr("class", "annotation-text")
      .attr("x", 16).attr("y", 8 + i * 60 + 4)
      .text(y);
  });

  // ── Resize ────────────────────────────────────────────────────────────────
  window.addEventListener("resize", () => {
    const nw = containerEl.clientWidth;
    if (Math.abs(nw - (W + M.left + M.right)) < 20) return;
    d3.select(selector).select("svg").remove();
    initBias(selector);
  });

  renderBias(filteredPlanets(), currentYear);
}
