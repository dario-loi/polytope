// The Atlas's geometry, shared by the <ply-atlas> element (atlas.js) and the server render in
// astro/Atlas.astro: places and the route from the stops, the globe's projection, the view
// that shows every place, and the flight from one view to the next. No DOM here.
import { geoOrthographic, geoPath, geoGraticule10, geoInterpolate, geoDistance, geoCentroid, geoContains } from "./atlas-geo.js";

export { geoPath, geoInterpolate, geoDistance };

// Zoom 1 shows the whole globe. A stop opens at 6, about 3000km across the panel.
export const ZOOM = { min: 1, max: 16, stop: 6 };
// Above this zoom the 1:50m outlines replace the 1:110m ones.
export const DETAIL = 3.5;
// Globe radius at zoom 1, as a share of the panel's shorter side.
const RADIUS = 0.44;
const DEG = 180 / Math.PI;

export const graticule = geoGraticule10();
export const sphere = { type: "Sphere" };

// TopoJSON to GeoJSON geometries: the land, each country, and the borders between countries
// (arcs that two countries share; coastlines belong to one).
export function decode(topo) {
  const [sx, sy] = topo.transform?.scale ?? [1, 1];
  const [tx, ty] = topo.transform?.translate ?? [0, 0];
  const arcs = topo.arcs.map((arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]);
  });
  const ring = (ids) => {
    const pts = [];
    for (const i of ids) {
      const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
      pts.push(...(pts.length ? a.slice(1) : a));
    }
    return pts;
  };
  const geometry = (g) => g.type === "Polygon" ? { type: "Polygon", coordinates: g.arcs.map(ring) }
    : g.type === "MultiPolygon" ? { type: "MultiPolygon", coordinates: g.arcs.map((p) => p.map(ring)) }
    : g.type === "GeometryCollection" ? { type: "GeometryCollection", geometries: g.geometries.map(geometry).filter(Boolean) }
    : null;
  const countries = topo.objects.countries.geometries.map(geometry).filter(Boolean);
  const owner = new Map(), shared = new Set();
  topo.objects.countries.geometries.forEach((g, n) => {
    const visit = (ids) => { for (const i of ids) { const k = i < 0 ? ~i : i; const o = owner.get(k); if (o === undefined) owner.set(k, n); else if (o !== n) shared.add(k); } };
    if (g.type === "Polygon") g.arcs.forEach(visit);
    else if (g.type === "MultiPolygon") g.arcs.forEach((p) => p.forEach(visit));
  });
  const land = geometry(topo.objects.land);
  const borders = { type: "MultiLineString", coordinates: [...shared].map((k) => arcs[k]) };
  return { land, countries, borders, landParts: parts(land), borderParts: borders.coordinates.map((line) => ({ coords: line, ...cap(line) })) };
}

// The smallest cap around a set of points, roughly: centered on their mean direction, out to
// the farthest one. A shape smaller than a hemisphere lies inside the cap of its outline.
function cap(points) {
  let x = 0, y = 0, z = 0;
  for (const [lon, lat] of points) {
    const l = lon / DEG, f = lat / DEG;
    x += Math.cos(f) * Math.cos(l); y += Math.cos(f) * Math.sin(l); z += Math.sin(f);
  }
  const c = [Math.atan2(y, x) * DEG, Math.atan2(z, Math.hypot(x, y)) * DEG];
  let r = 0;
  for (const p of points) r = Math.max(r, geoDistance(c, p));
  return { c, r };
}

// Polygons of a geometry, each with its cap, so a frame can skip the ones out of view.
export function parts(g) {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates
    : g.type === "GeometryCollection" ? g.geometries.flatMap((x) => parts(x).map((p) => p.coords)) : [];
  return polys.map((coords) => ({ coords, ...cap(coords[0]) }));
}

// Only the parts whose caps meet the visible cap. Projecting the whole world at every frame
// costs twice as much at a stop's zoom.
export function cull(items, view, w, h, type) {
  const r = radius(w, h, view.k);
  const seen = Math.asin(Math.min(1, Math.hypot(w, h) / 2 / r));
  const at = [view.lon, view.lat];
  return { type, coordinates: items.filter((p) => geoDistance(p.c, at) - p.r < seen).map((p) => p.coords) };
}

// "2019", "2019-09", or "2019-09-15" to a number that sorts by time. "now" sorts last.
export function when(text) {
  if (!text) return NaN;
  if (/^(now|present)$/i.test(text.trim())) return Infinity;
  const m = String(text).match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  return m ? +m[1] + ((+(m[2] || 1) - 1) + (+(m[3] || 1) - 1) / 31) / 12 : NaN;
}

// Stops ({ place, lon, lat, from }) to places, each with the stops held there, the route (one
// leg between each place and the next in date order), and the number of moves.
export function chart(stops) {
  const places = [];
  const byKey = new Map();
  stops.forEach((s, i) => {
    if (!Number.isFinite(s.lon) || !Number.isFinite(s.lat)) return;
    const key = `${s.lon.toFixed(2)},${s.lat.toFixed(2)}`;
    let p = byKey.get(key);
    if (!p) { p = { key, name: s.place, lon: s.lon, lat: s.lat, stops: [] }; byKey.set(key, p); places.push(p); }
    p.stops.push(i);
    s.at = places.indexOf(p);
  });
  const dated = stops.map((s, i) => ({ s, i, t: when(s.from) })).filter((d) => d.s.at !== undefined);
  // Undated stops keep their written order, after the dated ones.
  dated.sort((a, b) => (Number.isNaN(a.t) ? Infinity : a.t) - (Number.isNaN(b.t) ? Infinity : b.t) || a.i - b.i);
  // The route draws each pair of places once; moves counts every change of place.
  const legs = [];
  let moves = 0;
  for (let n = 1; n < dated.length; n++) {
    const a = places[dated[n - 1].s.at], b = places[dated[n].s.at];
    if (a !== b) moves++;
    if (a !== b && !legs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) legs.push([a, b]);
  }
  return { places, moves, route: { type: "MultiLineString", coordinates: legs.map(([a, b]) => [[a.lon, a.lat], [b.lon, b.lat]]) } };
}

// The country each place stands in. A coastal city can fall just outside simplified outlines,
// so a place in no country takes the nearest one within about 100km.
export function visited(countries, places) {
  const hit = new Set();
  for (const p of places) {
    const pt = [p.lon, p.lat];
    let found = countries.find((c) => geoContains(c, pt));
    if (!found) {
      let best = 0.016;
      for (const c of countries) {
        const polys = c.type === "Polygon" ? [c.coordinates] : c.coordinates;
        for (const poly of polys) for (const v of poly[0]) {
          if (Math.abs(v[1] - p.lat) > 1 || Math.abs(v[0] - p.lon) > 1.5) continue;
          const d = geoDistance(v, pt);
          if (d < best) { best = d; found = c; }
        }
      }
    }
    if (found) hit.add(found);
  }
  return [...hit];
}

export function projection(w, h, view) {
  return geoOrthographic()
    .rotate([-view.lon, -view.lat])
    .scale(RADIUS * Math.min(w, h) * view.k)
    .translate([w / 2, h / 2])
    .clipExtent([[-8, -8], [w + 8, h + 8]])
    .precision(0.5);
}

// Pixels per radian at this view, for turning a drag into degrees.
export const radius = (w, h, k) => RADIUS * Math.min(w, h) * k;

// True when the point faces the reader and lands inside the panel, with a margin.
export function shows(proj, view, lonlat, w, h, margin = 0) {
  if (geoDistance(lonlat, [view.lon, view.lat]) > Math.PI / 2 - 0.01) return false;
  const [x, y] = proj(lonlat);
  return x >= margin && x <= w - margin && y >= margin && y <= h - margin;
}

// The closest view that shows every place, centered between them, no closer than a stop.
export function overview(places, w, h) {
  if (!places.length) return { lon: 10, lat: 25, k: 1 };
  const [lon, lat] = places.length === 1 ? [places[0].lon, places[0].lat]
    : geoCentroid({ type: "MultiPoint", coordinates: places.map((p) => [p.lon, p.lat]) });
  const c = Number.isFinite(lon) && Number.isFinite(lat) ? { lon, lat } : { lon: places[0].lon, lat: places[0].lat };
  const margin = Math.min(w, h) * 0.14;
  const fits = (k) => {
    const view = { ...c, k };
    const proj = projection(w, h, view);
    return places.every((p) => shows(proj, view, [p.lon, p.lat], w, h, margin));
  };
  if (!fits(ZOOM.min)) return { ...c, k: ZOOM.min };
  let lo = Math.log(ZOOM.min), hi = Math.log(ZOOM.stop);
  if (fits(ZOOM.stop)) return { ...c, k: ZOOM.stop };
  for (let n = 0; n < 14; n++) { const mid = (lo + hi) / 2; if (fits(Math.exp(mid))) lo = mid; else hi = mid; }
  return { ...c, k: Math.exp(lo) };
}

const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// The ball on the route leads the camera and lands at 85% of the flight, so the camera
// arrives just after it.
export const lead = (t) => inOut(Math.min(1, t / 0.85));

// A flight from view a to view b: the center travels the great circle between them, and the
// zoom pulls back far enough mid-flight to show both ends. A zoom in place is quicker.
export function flight(a, b, w, h) {
  const from = [a.lon, a.lat], to = [b.lon, b.lat];
  const path = geoInterpolate(from, to);
  const d = geoDistance(from, to);
  const half = Math.min(w, h) * 0.4;
  const fit = d > 1e-6 ? Math.max(ZOOM.min, half / (radius(w, h, 1) * Math.sin(Math.min(d, Math.PI) / 2))) : Infinity;
  const low = Math.min(a.k, b.k);
  const dip = fit < low ? Math.log(low / fit) : 0;
  const k0 = Math.log(a.k), k1 = Math.log(b.k);
  const dk = Math.abs(k1 - k0);
  const duration = d < 1e-4 ? (dk < 1e-3 ? 0 : Math.round(260 + 140 * Math.min(1, dk / Math.log(4))))
    : Math.round(650 + 700 * Math.min(1, dip / Math.log(ZOOM.stop)) + 350 * Math.min(1, d / 0.6) + 120 * Math.min(1, dk));
  return {
    duration,
    at(t) {
      const e = inOut(t);
      const [lon, lat] = path(e);
      return { lon, lat, k: Math.exp(k0 + (k1 - k0) * e - dip * Math.sin(Math.PI * e)) };
    },
  };
}

// The caption's counts: "6 places, 6 moves between them."
export function tally(places, moves) {
  if (places === 1) return "1 place.";
  return moves ? `${places} places, ${moves} ${moves === 1 ? "move" : "moves"} between them.` : `${places} places.`;
}

// "41.90 N, 12.50 E"
export function coords(lon, lat) {
  const f = (v, pos, neg) => `${Math.abs(v).toFixed(2)} ${v >= 0 ? pos : neg}`;
  return `${f(lat, "N", "S")}, ${f(lon, "E", "W")}`;
}

export const toDegrees = (px, w, h, k) => (px / radius(w, h, k)) * DEG;
