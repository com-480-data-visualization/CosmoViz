// state.js — shared state object and event bus
// All cross-view communication goes through the bus.

// ── EVENT BUS ────────────────────────────────────────────────────────────────
export const bus = {
  emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  },
  on(name, fn) {
    window.addEventListener(name, e => fn(e.detail));
  },
};

// ── HOVER / SELECTION STATE ───────────────────────────────────────────────────
export let hoveredPlanet = null;
export function setHovered(planet) {
  hoveredPlanet = planet;
  bus.emit("planet-hovered", planet);
}

export let selectedPlanet = null;
export function setSelected(planet) {
  selectedPlanet = planet;
  bus.emit("planet-selected", planet);
}

// ── EARTH REFERENCE ──────────────────────────────────────────────────────────
// This object is injected into every scatter as the fixed comparison anchor.
export const EARTH = {
  pl_name:     "Earth",
  hostname:    "Sun",
  pl_rade:     1.0,
  pl_bmasse:   1.0,
  pl_eqt:      255,       // equilibrium temp without greenhouse effect [K]
  pl_orbper:   365.25,
  pl_orbsmax:  1.0,
  pl_insol:    1.0,
  st_teff:     5778,
  sy_dist:     0,
  disc_year:   null,
  size_class:  "Rocky",
  star_class:  "G",
  isEarth:     true,
};

// ── EARTH-LIKE CRITERIA ───────────────────────────────────────────────────────
// Mutable object — sliders.js writes to it, views read it for highlighting.
export const earthCriteria = {
  radius: { min: 0.8,  max: 1.5  },   // Earth radii
  temp:   { min: 200,  max: 320  },   // K
  period: { min: 200,  max: 500  },   // days
  insol:  { min: 0.5,  max: 1.5  },   // Earth flux (secondary, optional)
};

// ── ACTIVE SIZE-CLASS FILTER ──────────────────────────────────────────────────
// Null = no filter; a Set of class names = only show those classes
export let activeSizeClasses = null;

export function setSizeClassFilter(classNameOrNull) {
  if (classNameOrNull === null) {
    activeSizeClasses = null;
  } else if (activeSizeClasses && activeSizeClasses.has(classNameOrNull)) {
    // Toggle off
    activeSizeClasses.delete(classNameOrNull);
    if (activeSizeClasses.size === 0) activeSizeClasses = null;
  } else {
    if (!activeSizeClasses) activeSizeClasses = new Set();
    activeSizeClasses.add(classNameOrNull);
  }
  bus.emit("size-filter-changed", activeSizeClasses);
  notifyFilterChange();
}

// ── FILTER NOTIFICATION ───────────────────────────────────────────────────────
// Called by sliders, crossfilter wrappers, and timeline clicks.
export function notifyFilterChange() {
  bus.emit("filter-changed", null);
}
