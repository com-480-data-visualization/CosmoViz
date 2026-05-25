// skymap.js — View 4: Mollweide sky map (RA/Dec, all 762 planets)
// Color encodes equilibrium temperature. Size encodes inverse distance.
// Click a planet → filter explorer to that host star's system.

import { allPlanets }                          from "./data.js";
import { tempColorScale }                      from "./legend.js";
import { bus, setHovered, setSelected }        from "./state.js";
import { showTooltip, moveTooltip, hideTooltip, showDetailCard }  from "./tooltip.js";

const M = { top: 20, right: 20, bottom: 30, left: 20 };
let svg, projection, path, tempScale;

// Convert NASA RA [0,360] → D3 geo longitude [-180, 180]
function toLon(ra) { return ra > 180 ? ra - 360 : ra; }

// Dot size: inversely proportional to distance (nearer = bigger)
const sizeScale = () =>
  d3.scaleLog()
    .domain([6, 942])
    .range([6, 2])       // reversed: small dist → large dot
    .clamp(true);

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initSkyMap(selector) {
  const containerEl = document.querySelector(selector);
  if (!containerEl) return;

  tempScale = tempColorScale();
  const dotSize = sizeScale();

  const totalW = containerEl.clientWidth || 800;
  // Mollweide aspect ratio is 2:1
  const totalH = Math.round(totalW / 2.1);
  const W = totalW - M.left - M.right;
  const H = totalH - M.top  - M.bottom;

  svg = d3.select(selector).append("svg")
    .attr("id", "skymap-svg")
    .attr("width", totalW).attr("height", totalH);

  const g = svg.append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  // ── Projection ─────────────────────────────────────────────────────────────
  // d3.geoMollweide maps the full sphere; rotate so RA=0 is centered
  projection = d3.geoMollweide()
    .rotate([-180, 0])
    .fitSize([W, H], { type: "Sphere" });

  path = d3.geoPath().projection(projection);

  // ── Sphere outline ─────────────────────────────────────────────────────────
  g.append("path")
    .datum({ type: "Sphere" })
    .attr("d", path)
    .attr("fill", "#0d0d2a")
    .attr("stroke", "#2a2a4a")
    .attr("stroke-width", 1);

  // ── Graticule grid lines ───────────────────────────────────────────────────
  const graticule = d3.geoGraticule().step([30, 15]);
  g.append("path")
    .datum(graticule())
    .attr("class", "graticule")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#2a2a4a")
    .attr("opacity", 0.6);

  // ── Axis labels (RA hours) ─────────────────────────────────────────────────
  [0, 60, 120, 180, 240, 300].forEach(ra => {
    const lon = toLon(ra);
    const [px, py] = projection([lon, 0]) || [];
    if (!px) return;
    g.append("text")
      .attr("class", "annotation-text")
      .attr("x", px).attr("y", py + 14)
      .attr("text-anchor", "middle")
      .text(`${Math.round(ra / 15)}h`);
  });

  // ── Planet dots ────────────────────────────────────────────────────────────
  const validPlanets = allPlanets.filter(d => d.ra != null && d.dec != null);

  g.selectAll("circle.sky-planet")
    .data(validPlanets, d => d.pl_name)
    .join("circle")
    .attr("class", "sky-planet")
    .attr("cx", d => {
      const proj = projection([toLon(d.ra), d.dec]);
      return proj ? proj[0] : null;
    })
    .attr("cy", d => {
      const proj = projection([toLon(d.ra), d.dec]);
      return proj ? proj[1] : null;
    })
    .attr("r", d => d.sy_dist ? dotSize(d.sy_dist) : 3)
    .attr("fill", d => d.pl_eqt ? tempScale(d.pl_eqt) : "#888")
    .attr("opacity", 0.85)
    .attr("stroke", "rgba(255,255,255,0.08)")
    .attr("stroke-width", 0.5)
    .on("mouseover", (event, d) => { setHovered(d); showTooltip(event, d); })
    .on("mousemove", (event) => moveTooltip(event))
    .on("mouseout", () => { setHovered(null); hideTooltip(); })
    .on("click", (event, d) => {
      event.stopPropagation();
      setSelected(d);
      showDetailCard(d, { scrollIntoView: true });
      // Highlight system mates across views
      bus.emit("system-selected", d.hostname);
    });

  // ── Cross-highlight from other views ──────────────────────────────────────
  bus.on("planet-hovered", planet => {
    g.selectAll("circle.sky-planet")
      .attr("opacity", d => {
        if (!planet) return 0.85;
        return d.pl_name === planet.pl_name ? 1.0 : 0.2;
      })
      .attr("r", d => {
        const base = d.sy_dist ? dotSize(d.sy_dist) : 3;
        return (planet && d.pl_name === planet.pl_name) ? base * 2.5 : base;
      });
  });

  bus.on("system-selected", hostname => {
    g.selectAll("circle.sky-planet")
      .attr("opacity", d => {
        if (!hostname) return 0.85;
        return d.hostname === hostname ? 1.0 : 0.15;
      })
      .attr("r", d => {
        const base = d.sy_dist ? dotSize(d.sy_dist) : 3;
        return d.hostname === hostname ? base * 1.8 : base;
      });
  });

  // ── Temperature color legend strip ─────────────────────────────────────────
  buildTempLegend(g, W, H);

  // ── Resize ────────────────────────────────────────────────────────────────
  window.addEventListener("resize", () => {
    const nw = containerEl.clientWidth;
    if (Math.abs(nw - totalW) < 20) return;
    d3.select(selector).select("svg").remove();
    initSkyMap(selector);
  });
}

function buildTempLegend(g, W, H) {
  const legendW = 160, legendH = 10;
  const lx = W - legendW - 10;
  const ly = H - 30;

  const gradId = "temp-grad";
  const defs = g.append("defs");
  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");

  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", tempColorScale()(163 + t * (3646 - 163)));
  });

  g.append("rect")
    .attr("x", lx).attr("y", ly)
    .attr("width", legendW).attr("height", legendH)
    .attr("fill", `url(#${gradId})`)
    .attr("rx", 2);

  g.append("text").attr("class", "annotation-text")
    .attr("x", lx).attr("y", ly - 3)
    .text("163 K (cold)");

  g.append("text").attr("class", "annotation-text")
    .attr("x", lx + legendW).attr("y", ly - 3)
    .attr("text-anchor", "end")
    .text("3,646 K (hot)");

  g.append("text").attr("class", "annotation-text")
    .attr("x", lx + legendW / 2).attr("y", ly + legendH + 12)
    .attr("text-anchor", "middle")
    .text("Equilibrium temperature");

  // Size legend
  const sx = 10, sy = H - 55;
  g.append("text").attr("class", "annotation-text")
    .attr("x", sx).attr("y", sy).text("Dot size ∝ nearness");
  [[10, "~10 pc"], [50, "~50 pc"], [200, "~200 pc"]].forEach(([dist, label], i) => {
    const dotSize = d3.scaleLog().domain([6, 942]).range([6, 2]).clamp(true);
    const r = dotSize(dist);
    const cx = sx + i * 55 + 8;
    g.append("circle").attr("cx", cx).attr("cy", sy + 16).attr("r", r)
      .attr("fill", "#aaa").attr("opacity", 0.7);
    g.append("text").attr("class", "annotation-text")
      .attr("x", cx).attr("y", sy + 30).attr("text-anchor", "middle")
      .text(label);
  });
}
