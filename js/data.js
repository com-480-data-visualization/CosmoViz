// data.js — load CSV, compute derived features, initialise Crossfilter

// ── DERIVED FEATURE HELPERS ───────────────────────────────────────────────────

function sizeClass(r) {
  if (r == null) return "Unknown";
  if (r < 1.25)  return "Rocky";
  if (r < 2.0)   return "Super-Earth";
  if (r < 4.0)   return "Sub-Neptune";
  if (r < 10.0)  return "Neptune-like";
  return "Gas Giant";
}

function starClass(t) {
  if (t == null) return "Unknown";
  if (t < 3900)  return "M";
  if (t < 5300)  return "K";
  if (t < 6000)  return "G";
  return "F";
}

// Stellar luminosity in solar units from radius and effective temperature
function stellarLuminosity(st_rad, st_teff) {
  if (!st_rad || !st_teff) return null;
  return st_rad ** 2 * (st_teff / 5778) ** 4;
}

// Approximate habitable zone center [au] from luminosity
function hzCenter(st_rad, st_teff) {
  const L = stellarLuminosity(st_rad, st_teff);
  if (!L) return null;
  return Math.sqrt(L / 1.1);
}

// Ratio of planet semi-major axis to its star's HZ center (1.0 = perfect)
function hzRatio(pl_orbsmax, hz) {
  if (!pl_orbsmax || !hz) return null;
  return pl_orbsmax / hz;
}

// ── ROW PARSER ────────────────────────────────────────────────────────────────
function parseRow(row) {
  // NASA archive CSV has comment rows starting with '#' which D3 skips,
  // but the first data row after them is the header — already handled by d3.csv.
  // Reject any row without a planet name (defensive check).
  if (!row.pl_name || row.pl_name.startsWith("#")) return null;

  const num = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  return {
    // identifiers
    pl_name:      row.pl_name.trim(),
    hostname:     row.hostname?.trim() || null,
    // planet physical
    pl_rade:      num(row.pl_rade),
    pl_bmasse:    num(row.pl_bmasse),
    pl_eqt:       num(row.pl_eqt),
    pl_orbper:    num(row.pl_orbper),
    pl_orbsmax:   num(row.pl_orbsmax),
    pl_insol:     num(row.pl_insol),
    pl_orbeccen:  num(row.pl_orbeccen),
    // stellar
    st_teff:      num(row.st_teff),
    st_rad:       num(row.st_rad),
    st_mass:      num(row.st_mass),
    st_met:       num(row.st_met),
    st_logg:      num(row.st_logg),
    // system
    sy_dist:      num(row.sy_dist),
    sy_pnum:      num(row.sy_pnum),
    sy_snum:      num(row.sy_snum),
    ra:           num(row.ra),
    dec:          num(row.dec),
    disc_year:    num(row.disc_year),
    discoverymethod: row.discoverymethod?.trim() || null,
  };
}

// ── MODULE STATE ──────────────────────────────────────────────────────────────
export let allPlanets   = [];   // all 762, for sky map
export let corePlanets  = [];   // ~613 with radius + eqt + st_teff

export let cf;                  // crossfilter instance
export let dims = {};           // crossfilter dimensions
export let allGroup;            // crossfilter groupAll

// ── MAIN LOAD FUNCTION ────────────────────────────────────────────────────────
export async function loadData() {
  // d3.csv() does NOT skip # comment lines — it would treat the first comment
  // as the header, breaking all column names. We use d3.text() + d3.csvParse()
  // to strip comments ourselves before parsing.
  const rawText = await d3.text("data/PS_2026.03.20_03.49.15.csv");
  const cleaned = rawText
    .split("\n")
    .filter(line => !line.startsWith("#"))
    .join("\n");

  const raw = d3.csvParse(cleaned, row => parseRow(row));

  // Filter nulls returned by parseRow (rows with no pl_name)
  const planets = raw.filter(Boolean);

  // ── Compute derived features ──────────────────────────────────────────
  planets.forEach(d => {
    d.size_class = sizeClass(d.pl_rade);
    d.star_class = starClass(d.st_teff);
    d.hz_center  = hzCenter(d.st_rad, d.st_teff);
    d.hz_ratio   = hzRatio(d.pl_orbsmax, d.hz_center);
    d.log_period = d.pl_orbper  ? Math.log10(d.pl_orbper)  : null;
    d.log_radius = d.pl_rade    ? Math.log10(d.pl_rade)    : null;
  });

  allPlanets  = planets;
  corePlanets = planets.filter(d =>
    d.pl_rade  != null &&
    d.pl_eqt   != null &&
    d.st_teff  != null
  );

  // ── Crossfilter on corePlanets ─────────────────────────────────────────
  cf = crossfilter(corePlanets);

  dims = {
    radius:    cf.dimension(d => d.pl_rade),
    temp:      cf.dimension(d => d.pl_eqt),
    period:    cf.dimension(d => d.pl_orbper),
    insol:     cf.dimension(d => d.pl_insol),
    year:      cf.dimension(d => d.disc_year),
    sizeClass: cf.dimension(d => d.size_class),
    starClass: cf.dimension(d => d.star_class),
  };

  allGroup = cf.groupAll();

  return { allPlanets, corePlanets };
}

// ── FILTERED PLANET ACCESSOR ──────────────────────────────────────────────────
// Always returns the current crossfilter-filtered array.
// Uses radius dim as the "all" dimension (no radius filter active by default).
export function filteredPlanets() {
  return dims.radius.top(Infinity);
}
