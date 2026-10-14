// The Atlas's geometry, shared by the <ply-atlas> element (atlas.js) and the server render in
// astro/Atlas.astro: places and the route from the stops, the globe's projection, the view
// that shows every place, and the flight from one view to the next. No DOM here.
import { geoOrthographic, geoPath, geoGraticule10, geoInterpolate, geoCentroid, geoContains } from "./atlas-geo.js";

export { geoPath, geoInterpolate };

// Zoom 1 shows the whole globe. A stop opens at 6, about 3000km across the panel.
export const ZOOM = { min: 1, max: 16, stop: 6 };
// Above this zoom the 1:50m outlines replace the 1:110m ones.
export const DETAIL = 3.5;
// Globe radius at zoom 1, as a share of the panel's shorter side.
const RADIUS = 0.44;
const DEG = 180 / Math.PI;

// The great-circle distance in radians between two [lon, lat] points in degrees, as d3's
// geoDistance gives it. d3 measures it as the length of a line, with exact sums, which is too
// slow for the loops here: building the caps visits every point of every outline.
export function geoDistance(a, b) {
  const f1 = a[1] / DEG, f2 = b[1] / DEG;
  const s = Math.sin((f2 - f1) / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin((b[0] - a[0]) / DEG / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

export const graticule = geoGraticule10();
export const sphere = { type: "Sphere" };

// TopoJSON to GeoJSON geometries: the land, each country, and the borders between countries
// (arcs that two countries share; coastlines belong to one). The server decodes in one go; the
// browser decodes in slices (decodeSliced), so the page can respond in between.
export function decode(topo) {
  return run(decoding(topo));
}

export function decodeSliced(topo, pause) {
  return runSliced(decoding(topo), pause);
}

function run(steps) {
  let r;
  while (!(r = steps.next()).done);
  return r.value;
}

// Runs a generator, giving the page a turn whenever about 4ms have passed. The generators yield
// after every small piece of work, so no slice runs long.
async function runSliced(steps, pause) {
  let r, t = performance.now();
  while (!(r = steps.next()).done) {
    if (performance.now() - t > 4) { await pause(); t = performance.now(); }
  }
  return r.value;
}

function* decoding(topo) {
  const [sx, sy] = topo.transform?.scale ?? [1, 1];
  const [tx, ty] = topo.transform?.translate ?? [0, 0];
  const arcs = [];
  for (const arc of topo.arcs) {
    let x = 0, y = 0;
    arcs.push(arc.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]));
    yield;
  }
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
  const countries = [];
  for (const g of topo.objects.countries.geometries) {
    const c = geometry(g);
    if (c) countries.push(c);
    yield;
  }
  const owner = new Map(), shared = new Set();
  for (const [n, g] of topo.objects.countries.geometries.entries()) {
    const visit = (ids) => { for (const i of ids) { const k = i < 0 ? ~i : i; const o = owner.get(k); if (o === undefined) owner.set(k, n); else if (o !== n) shared.add(k); } };
    if (g.type === "Polygon") g.arcs.forEach(visit);
    else if (g.type === "MultiPolygon") g.arcs.forEach((p) => p.forEach(visit));
    yield;
  }
  // The land is one shape of many polygons, so it is built a polygon at a time.
  const shapes = [];
  for (const g of topo.objects.land.type === "GeometryCollection" ? topo.objects.land.geometries : [topo.objects.land]) {
    if (g.type !== "MultiPolygon") { const one = geometry(g); if (one) shapes.push(one); yield; continue; }
    const coordinates = [];
    for (const p of g.arcs) { coordinates.push(p.map(ring)); yield; }
    shapes.push({ type: "MultiPolygon", coordinates });
  }
  const land = topo.objects.land.type === "GeometryCollection" ? { type: "GeometryCollection", geometries: shapes } : shapes[0];
  const borders = { type: "MultiLineString", coordinates: [...shared].map((k) => arcs[k]) };
  const landParts = [];
  for (const part of polygons(land)) { landParts.push(piece(part)); yield; }
  const borderParts = [];
  for (const line of borders.coordinates) { borderParts.push({ coords: line, ...cap(line) }); yield; }
  return { land, countries, borders, landParts, borderParts };
}

// The smallest cap around a set of points, roughly: centered on their mean direction, out to
// the farthest one. A shape smaller than a hemisphere lies inside the cap of its outline.
function cap(points) {
  const n = points.length, v = new Float64Array(n * 3);
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < n; i++) {
    const l = points[i][0] / DEG, f = points[i][1] / DEG, cf = Math.cos(f);
    x += v[3 * i] = cf * Math.cos(l); y += v[3 * i + 1] = cf * Math.sin(l); z += v[3 * i + 2] = Math.sin(f);
  }
  const len = Math.hypot(x, y, z) || 1;
  const c = [Math.atan2(y, x) * DEG, Math.atan2(z, Math.hypot(x, y)) * DEG];
  // The farthest point is the one whose direction is least like the center's.
  let near = 1;
  for (let i = 0; i < n; i++) near = Math.min(near, (v[3 * i] * x + v[3 * i + 1] * y + v[3 * i + 2] * z) / len);
  return { c, r: Math.acos(Math.max(-1, Math.min(1, near))) };
}

// Polygons of a geometry, each with its cap, so a frame can skip the ones out of view.
export function parts(g) {
  return polygons(g).map(piece);
}

// A polygon with its cap, and its long rings in runs (see trim).
function piece(coords) {
  return { coords, ...cap(coords[0]), runs: coords.some((ring) => ring.length >= RUN * 3) ? coords.map(runsOf) : null };
}

// A continent is one polygon of thousands of points, so it passes the cull whole even when a
// stop's zoom shows a bay of it. Its long rings are kept in runs of RUN points, each with its
// cap, and a frame stands in for a run out of view with the run's two ends.
const RUN = 32;
function runsOf(ring) {
  if (ring.length < RUN * 3) return null;
  const runs = [];
  for (let a = 0; a < ring.length - 1; a += RUN) {
    const b = Math.min(a + RUN, ring.length - 1);
    runs.push({ a, b, ...cap(ring.slice(a, b + 1)) });
  }
  return runs;
}

// The ring with each run that cannot show replaced by its two ends. A run lies in its cap, and
// the straight way between its ends stays in the cap too, so the change keeps out of view and
// the fill on screen is the same. That holds for a run whose cap is wholly behind the globe,
// and for one centered on the near side and clear of the visible cap (seen): seen from in
// front, such a cap is a convex shape. A cap that reaches over the edge from behind keeps its
// run whole.
function trim(ring, runs, at, seen) {
  if (!runs) return ring;
  const out = [];
  for (const { a, b, c, r } of runs) {
    const d = geoDistance(c, at);
    if (d - r >= Math.PI / 2 || (d <= Math.PI / 2 && d - r > seen)) out.push(ring[a]);
    else for (let i = a; i < b; i++) out.push(ring[i]);
  }
  out.push(ring[ring.length - 1]);
  return out;
}

function polygons(g) {
  return g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates
    : g.type === "GeometryCollection" ? g.geometries.flatMap(polygons) : [];
}

// Only the parts whose caps meet the visible cap, and that would draw larger than half a
// pixel. Projecting the whole world at every frame costs twice as much at a stop's zoom, and
// simplification leaves some islands with almost no area.
export function cull(items, view, w, h, type) {
  const r = radius(w, h, view.k);
  const seen = Math.asin(Math.min(1, Math.hypot(w, h) / 2 / r));
  const tiny = 0.5 / r;
  const at = [view.lon, view.lat];
  return {
    type,
    coordinates: items.filter((p) => p.r >= tiny && geoDistance(p.c, at) - p.r < seen)
      // With the whole disc in view no run is out of it, and checking them costs a little.
      .map((p) => (p.runs && seen < Math.PI / 2 - 0.01 ? p.coords.map((ring, i) => trim(ring, p.runs[i], at, seen)) : p.coords)),
  };
}

// "2019", "2019-09", or "2019-09-15" to a number that sorts by time. "now" sorts last.
export function when(text) {
  if (!text) return NaN;
  if (/^(now|present)$/i.test(text.trim())) return Infinity;
  const m = String(text).match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  return m ? +m[1] + ((+(m[2] || 1) - 1) + (+(m[3] || 1) - 1) / 31) / 12 : NaN;
}

// Stops ({ place, lon, lat, from }) to places, each with the stops held there, the route (one
// leg between each place and the next in date order), and the number of moves. Also the stops
// in date order (order, as indexes into stops) and each move in that order (trips: the leg it
// takes, and the stops it leaves and reaches), which heat() reads.
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
  const legs = [], trips = [];
  for (let n = 1; n < dated.length; n++) {
    const a = places[dated[n - 1].s.at], b = places[dated[n].s.at];
    if (a === b) continue;
    let leg = legs.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (leg < 0) leg = legs.push([a, b]) - 1;
    trips.push({ leg, from: dated[n - 1].i, to: dated[n].i });
  }
  return {
    places, moves: trips.length, trips, order: dated.map((d) => d.i),
    route: { type: "MultiLineString", coordinates: legs.map(([a, b]) => [[a.lon, a.lat], [b.lon, b.lat]]) },
  };
}

// How much each leg of a chart's route stands out while one stop (an index into its stops) is
// current, as a share of the route's opacity. The moves into and out of the current place keep
// the full chalk; every other leg fades with each move between it and the current place (0.55,
// 0.3, then 0.15), so a long CV does not cover the globe in lines. With no stop current, every
// leg is full chalk.
export function heat(shown, current) {
  const FADE = [1, 0.55, 0.3];
  const n = shown.route.coordinates.length;
  const at = shown.order.indexOf(current);
  if (at < 0) return new Array(n).fill(1);
  const rank = new Map(shown.order.map((i, k) => [i, k]));
  // Moves made by the time of the current stop: the last of them reaches its place.
  const made = shown.trips.filter((t) => rank.get(t.to) <= at).length;
  const away = new Array(n).fill(Infinity);
  shown.trips.forEach((t, k) => { away[t.leg] = Math.min(away[t.leg], k < made ? made - 1 - k : k - made); });
  return away.map((d) => FADE[d] ?? 0.15);
}

// The country each place stands in. A coastal city can fall just outside simplified outlines,
// so a place in no country takes the nearest one within about 100km.
export function visited(countries, places) {
  return run(visiting(countries, places));
}

export function visitedSliced(countries, places, pause) {
  return runSliced(visiting(countries, places), pause);
}

function* visiting(countries, places) {
  const hit = new Set();
  // The full test walks every edge of a country, so first rule out the countries whose caps,
  // with 100km to spare, do not reach the place.
  const caps = [];
  for (const c of countries) {
    caps.push((c.type === "Polygon" ? [c.coordinates] : c.coordinates).map((poly) => cap(poly[0])));
    yield;
  }
  for (const p of places) {
    yield;
    const pt = [p.lon, p.lat];
    const near = countries.filter((c, i) => caps[i].some((k) => geoDistance(k.c, pt) <= k.r + 0.016));
    let found = near.find((c) => geoContains(c, pt));
    if (!found) {
      let best = 0.016;
      for (const c of near) {
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

// A view is a center, a zoom, and a roll: the bearing, in degrees clockwise from north, that
// points up the panel. Views at rest have no roll; a flight rolls on its way (see flight).
export function projection(w, h, view) {
  return geoOrthographic()
    .rotate([-view.lon, -view.lat, view.roll || 0])
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

// The bearing from a to b, in degrees clockwise from north.
function bearing(a, b) {
  const f1 = a[1] / DEG, f2 = b[1] / DEG, dl = (b[0] - a[0]) / DEG;
  return Math.atan2(Math.sin(dl) * Math.cos(f2), Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)) * DEG;
}
const wrap = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;

// How far the panel's roll should sit from north-up at point p, e of the way along a route
// d radians long: the route's bearing there, less its bearing at the start, less that change
// smoothed along the route (a Gaussian 15 degrees of arc wide, with the ends held in place).
// The roll then follows the smoothed change, which goes round a pole without a jump. On a
// route shorter than three times that, smoothing comes to the same as spreading the change
// evenly, which is cheaper, so the change is spread evenly.
function turning(path, from, to, d) {
  if (d <= 1e-4) return { offset: () => 0 };
  const heading = (p, e) => (e < 0.5 ? bearing(p, to) : bearing(p, from) + 180);
  const h0 = heading(from, 0), N = 256, sigma = (15 / DEG / d) * N;
  // The change in bearing, unwrapped: no step between samples is half a turn or more.
  const u = [0];
  for (let i = 1; i <= N; i++) { const e = i / N, x = heading(path(e), e) - h0; u.push(u[i - 1] + wrap(x - u[i - 1])); }
  // Smooth what is left after the straight line from 0 to the whole change. Reflected oddly
  // past each end, that remainder stays 0 at both ends.
  const line = (i) => (i / N) * u[N];
  let smooth = u.map((_, i) => line(i));
  const span = Math.ceil(3 * sigma);
  if (span < N) {
    const rem = new Float64Array(N + 1 + 2 * span);
    for (let j = -span; j <= N + span; j++) {
      const m = j < 0 ? -j : j > N ? 2 * N - j : j;
      rem[j + span] = (j < 0 || j > N ? -1 : 1) * (u[m] - line(m));
    }
    const kernel = new Float64Array(2 * span + 1);
    for (let j = -span; j <= span; j++) kernel[j + span] = Math.exp(-0.5 * (j / sigma) ** 2);
    const total = kernel.reduce((x, y) => x + y, 0);
    smooth = smooth.map((l, i) => { let s = 0; for (let j = 0; j <= 2 * span; j++) s += kernel[j] * rem[i + j]; return l + s / total; });
  }
  return {
    offset(p, e) {
      const x = e * N, i = Math.min(N - 1, Math.floor(x)), f = x - i;
      return heading(p, e) - h0 - (smooth[i] + (smooth[i + 1] - smooth[i]) * f);
    },
  };
}

// A flight from view a to view b: the center travels the great circle between them, and the
// zoom pulls back far enough mid-flight to show both ends. A zoom in place is quicker.
// Keeping north up all the way would spin the globe half a turn in a frame where the route
// passes near a pole. Instead the panel turns as the route's bearing turns, smoothed, so it
// keeps north up wherever the bearing changes slowly and takes the half turn at a pole over
// about a third of the route. Any roll the flight starts or ends with is eased in or out.
export function flight(a, b, w, h) {
  const from = [a.lon, a.lat], to = [b.lon, b.lat];
  const path = geoInterpolate(from, to);
  const d = geoDistance(from, to);
  const turn = turning(path, from, to, d);
  const ra = a.roll || 0, rb = b.roll || 0, rest = wrap(ra - rb);
  const half = Math.min(w, h) * 0.4;
  const fit = d > 1e-6 ? Math.max(ZOOM.min, half / (radius(w, h, 1) * Math.sin(Math.min(d, Math.PI) / 2))) : Infinity;
  const low = Math.min(a.k, b.k);
  const dip = fit < low ? Math.log(low / fit) : 0;
  const k0 = Math.log(a.k), k1 = Math.log(b.k);
  const dk = Math.abs(k1 - k0);
  const dr = Math.abs(rest) / 90;
  const duration = d < 1e-4 ? (dk < 1e-3 && dr < 0.005 ? 0 : Math.round(260 + 140 * Math.min(1, Math.max(dk / Math.log(4), dr))))
    : Math.round(650 + 700 * Math.min(1, dip / Math.log(ZOOM.stop)) + 350 * Math.min(1, d / 0.6) + 120 * Math.min(1, dk));
  return {
    duration,
    at(t) {
      const e = inOut(t);
      const [lon, lat] = path(e);
      const r = wrap(ra + turn.offset([lon, lat], e) - rest * e);
      const roll = e === 1 || !Number.isFinite(r) ? rb : r;
      return { lon, lat, k: Math.exp(k0 + (k1 - k0) * e - dip * Math.sin(Math.PI * e)), roll };
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
