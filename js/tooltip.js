// tooltip.js — shared floating tooltip + pinned detail card

let tooltipEl = null;

function ensureTooltip() {
  if (!tooltipEl) {
    tooltipEl = d3.select("body").append("div")
      .attr("id", "tooltip")
      .style("display", "none")
      .style("pointer-events", "none")
      .node();
  }
  return d3.select(tooltipEl);
}

// ── FORMAT HELPERS ────────────────────────────────────────────────────────────
function fmt(val, decimals, unit) {
  return val != null ? `${(+val).toFixed(decimals)} ${unit}` : "—";
}
function fmtInt(val, unit) {
  return val != null ? `${Math.round(+val)} ${unit}` : "—";
}

// ── MAIN SHOW / HIDE ──────────────────────────────────────────────────────────
export function showTooltip(event, d) {
  const tt = ensureTooltip();
  const isEarth = d.isEarth;

  const hzNote = d.hz_ratio != null
    ? `${d.hz_ratio.toFixed(2)}× HZ center`
    : "";

  tt.style("display", "block").html(`
    <div class="tt-name">${d.pl_name}${isEarth ? " 🌍" : ""}</div>
    <div class="tt-class">${d.size_class || "?"} · ${d.star_class || "?"} star</div>
    <div class="tt-body">
      <div class="tt-row">
        <span>Radius</span>
        <span>${fmt(d.pl_rade, 2, "R⊕")}</span>
      </div>
      <div class="tt-row">
        <span>Temperature</span>
        <span>${fmtInt(d.pl_eqt, "K")}</span>
      </div>
      <div class="tt-row">
        <span>Period</span>
        <span>${fmt(d.pl_orbper, 1, "days")}</span>
      </div>
      <div class="tt-row">
        <span>Mass</span>
        <span>${d.pl_bmasse != null ? fmt(d.pl_bmasse, 1, "M⊕") : "not measured"}</span>
      </div>
      ${d.pl_insol != null ? `
      <div class="tt-row">
        <span>Insolation</span>
        <span>${fmt(d.pl_insol, 2, "S⊕")}</span>
      </div>` : ""}
      ${hzNote ? `
      <div class="tt-row">
        <span>HZ position</span>
        <span>${hzNote}</span>
      </div>` : ""}
      <div class="tt-row">
        <span>Distance</span>
        <span>${d.sy_dist ? fmtInt(d.sy_dist, "pc") : "—"}</span>
      </div>
      <div class="tt-row">
        <span>Discovered</span>
        <span>${d.disc_year || "—"}</span>
      </div>
      <div class="tt-row">
        <span>Host star</span>
        <span>${d.hostname || "—"}</span>
      </div>
    </div>
    ${!isEarth ? `
    <a class="tt-link"
       href="https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(d.hostname || d.pl_name)}"
       target="_blank" rel="noopener">
      NASA Archive ↗
    </a>` : ""}
  `);

  moveTooltip(event);
}

export function moveTooltip(event) {
  if (!tooltipEl) return;
  const tt = d3.select(tooltipEl);
  const w = window.innerWidth;
  const ttWidth = 240;
  const x = event.pageX;
  const left = x + ttWidth + 20 > w
    ? x - ttWidth - 10
    : x + 14;
  tt.style("left", `${left}px`)
    .style("top",  `${event.pageY - 28}px`);
}

export function hideTooltip() {
  if (!tooltipEl) return;
  d3.select(tooltipEl).style("display", "none");
}

// ── PINNED DETAIL CARD (click) ─────────────────────────────────────────────
export function showDetailCard(d) {
  const card = d3.select("#detail-card");
  if (!d) { card.style("display", "none"); return; }

  const isEarth = d.isEarth;
  card.style("display", "block").html(`
    <button class="detail-close" id="detail-close-btn">✕</button>
    <div class="detail-name">${d.pl_name}${isEarth ? " 🌍" : ""}</div>
    <div class="detail-class">${d.size_class || "?"} · ${d.star_class || "?"} star · ${d.disc_year || "—"}</div>
    <table class="detail-table">
      <tr><td>Radius</td><td>${fmt(d.pl_rade, 3, "R⊕")}</td></tr>
      <tr><td>Mass</td><td>${d.pl_bmasse != null ? fmt(d.pl_bmasse, 2, "M⊕") : "not measured"}</td></tr>
      <tr><td>Temperature</td><td>${fmtInt(d.pl_eqt, "K")}</td></tr>
      <tr><td>Orbital period</td><td>${fmt(d.pl_orbper, 2, "days")}</td></tr>
      <tr><td>Semi-major axis</td><td>${fmt(d.pl_orbsmax, 3, "au")}</td></tr>
      <tr><td>Insolation</td><td>${d.pl_insol != null ? fmt(d.pl_insol, 2, "S⊕") : "—"}</td></tr>
      <tr><td>Eccentricity</td><td>${fmt(d.pl_orbeccen, 3, "")}</td></tr>
      <tr><td>HZ ratio</td><td>${d.hz_ratio != null ? d.hz_ratio.toFixed(3) : "—"}</td></tr>
      <tr><td>Host star</td><td>${d.hostname || "—"} (${d.star_class || "?"})</td></tr>
      <tr><td>Star temp</td><td>${fmtInt(d.st_teff, "K")}</td></tr>
      <tr><td>Metallicity</td><td>${fmt(d.st_met, 2, "dex")}</td></tr>
      <tr><td>Distance</td><td>${d.sy_dist ? fmtInt(d.sy_dist, "pc") : "—"}</td></tr>
      <tr><td>Planets in system</td><td>${d.sy_pnum || "—"}</td></tr>
    </table>
    ${!isEarth ? `
    <a class="detail-link"
       href="https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(d.hostname || d.pl_name)}"
       target="_blank" rel="noopener">
      View on NASA Exoplanet Archive ↗
    </a>` : ""}
  `);

  document.getElementById("detail-close-btn")
    ?.addEventListener("click", () => showDetailCard(null));
}
