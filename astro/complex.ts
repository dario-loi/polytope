// The Vietoris-Rips complex Complex.astro draws, as plain data: the same generator, layout, and
// cells as css/js/complex.js, so a server-drawn mark, a card's fallback, and a share-card script
// all come out as the same picture for the same seed. Use it to draw one yourself.
//   const { pts, edges, tris } = complexLayout(seedOf("Topology"), 15, 0.23);

export type Point = [number, number];

export interface ComplexLayout {
  /** Points in a 100 by 56 box. */
  pts: Point[];
  /** Index pairs closer than the radius. */
  edges: [number, number][];
  /** Index triples whose three edges are all present. */
  tris: [number, number, number][];
}

/** A stable seed from a name, for a mark that always draws the same complex: "Topology" gives
 *  the same number on every page and every build. */
export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0 || 1;
}

/** `points` random points on a jittered grid in a 100 by 56 box, from `seed`, joined where closer
 *  than `radius` (a fraction of the box's width, as the Complex slider's). */
export function complexLayout(seed: number, points: number, radius: number): ComplexLayout {
  let s = seed >>> 0 || 1;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cols = Math.ceil(Math.sqrt(points * 1.8)), rows = Math.ceil(points / cols);
  const pts: Point[] = Array.from({ length: points }, (_, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    return [6 + ((c + 0.15 + rand() * 0.7) / cols) * 88, 5 + ((r + 0.15 + rand() * 0.7) / rows) * 46];
  });
  const R = radius * 100;
  const adj = pts.map(() => new Set<number>());
  const edges: [number, number][] = [];
  for (let i = 0; i < points; i++) for (let j = i + 1; j < points; j++) {
    if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) <= R) { edges.push([i, j]); adj[i].add(j); adj[j].add(i); }
  }
  const tris: [number, number, number][] = [];
  for (const [i, j] of edges) for (const k of adj[i]) if (k > j && adj[j].has(k)) tris.push([i, j, k]);
  return { pts, edges, tris };
}
