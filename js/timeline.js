// timeline.js — Discovery timeline: stacked area chart (year × planet count)
// Stacked by size class (Rocky / Super-Earth / Sub-Neptune / Neptune / Giant).
// Click a class area to toggle size-class filter across all views.

import { corePlanets }                        from "./data.js";
import { SIZE_COLORS, SIZE_ORDER }            from "./legend.js";
import { bus, setSizeClassFilter, activeSizeClasses } from "./state.js";

const YEARS  = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const M      = { top: 30, right: 30, bottom: 50, left: 55 };
let svg, plotArea, xScale, yScale;

// ── BUILD STACK DATA ──────────────────────────────────────────────────────────
function buildStackData(planets) {
  const counts = d3.rollup(
    planets,
    v => v.length,
    d => d.disc_year,
    d => d.size_class,
  );

  return YEARS.map(year => {
    const row = { year };
    SIZE_ORDER.forEach(cls => {
      row[cls] = counts.get(year)?.get(cls) ?? 0;
    });
    return row;
  });
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderTimeline(planets) {
  if (!plotArea) return;

  const stackData = buildStackData(planets);
  const stack = d3.stack().keys(SIZE_ORDER);
  const series = stack(stackData);

  const maxY = d3.max(stackData, d => SIZE_ORDER.reduce((s, k) => s + d[k], 0));
  yScale.domain([0, maxY]).nice();

  // Update Y axis
  svg.select(".y-axis").call(d3.axisLeft(yScale).ticks(5));

  // Area generator
  const area = d3.area()
    .x(d => xScale(d.data.year) + xScale.bandwidth() / 2)
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]))
    .curve(d3.curveMonotoneX);

  // General update pattern for stacked areas
  const paths = plotArea.selectAll("path.timeline-area")
    .data(series, s => s.key);

  paths.exit().remove();

  paths.enter()
    .append("path")
    .attr("class", "timeline-area")
    .attr("fill", s => SIZE_COLORS[s.key])
    .attr("opacity", 0.85)
    .style("cursor", "pointer")
    .on("click", (event, s) => {
      setSizeClassFilter(s.key);
    })
    .on("mouseover", (event, s) => {
      // Dim all except hovered class
      plotArea.selectAll("path.timeline-area")
        .attr("opacity", p => p.key === s.key ? 1 : 0.4);
      // Tooltip-style label
      const el = document.getElementById("timeline-hover-label");
      if (el) el.textContent = `${s.key}: click to filter all views`;
    })
    .on("mouseout", () => {
      plotArea.selectAll("path.timeline-area").attr("opacity", 0.85);
      const el = document.getElementById("timeline-hover-label");
      if (el) el.textContent = "";
    })
    .merge(paths)
    .transition().duration(500)
    .attr("d", area);

  // Year annotation: total per year
  const totals = stackData.map(d => ({
    year: d.year,
    total: SIZE_ORDER.reduce((s, k) => s + d[k], 0),
  }));

  const labels = plotArea.selectAll("text.year-count")
    .data(totals, d => d.year);

  labels.exit().remove();

  labels.enter()
    .append("text")
    .attr("class", "year-count annotation-text")
    .attr("text-anchor", "middle")
    .merge(labels)
    .transition().duration(500)
    .attr("x", d => xScale(d.year) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.total) - 4)
    .text(d => d.total > 0 ? d.total : "");
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initTimeline(selector) {
  const containerEl = document.querySelector(selector);
  if (!containerEl) return;

  const totalW = containerEl.clientWidth || 800;
  const totalH = 200;
  const W = totalW - M.left - M.right;
  const H = totalH - M.top  - M.bottom;

  xScale = d3.scaleBand().domain(YEARS).range([0, W]).padding(0.08);
  yScale = d3.scaleLinear().range([H, 0]);

  svg = d3.select(selector).append("svg")
    .attr("id", "timeline-svg")
    .attr("width", totalW).attr("height", totalH);

  plotArea = svg.append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  // Axes
  plotArea.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(xScale).tickFormat(d => `'${String(d).slice(2)}`));

  plotArea.append("g").attr("class", "axis y-axis")
    .call(d3.axisLeft(yScale).ticks(5));

  svg.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(M.top + H / 2)).attr("y", 14)
    .attr("text-anchor", "middle")
    .text("New planets");

  // Hover label
  d3.select(selector).append("div")
    .attr("id", "timeline-hover-label")
    .attr("class", "annotation-text")
    .style("height", "16px")
    .style("text-align", "center")
    .style("margin-top", "4px");

  // Bus: re-render when planet-level filters change
  bus.on("filter-changed", () => renderTimeline(corePlanets));

  // Bus: dim/highlight on size-filter change
  bus.on("size-filter-changed", activeSet => {
    plotArea.selectAll("path.timeline-area")
      .attr("opacity", s => {
        if (!activeSet) return 0.85;
        return activeSet.has(s.key) ? 1.0 : 0.35;
      });
  });

  renderTimeline(corePlanets);
}
