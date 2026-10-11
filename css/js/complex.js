// <ply-complex>: a live Vietoris-Rips complex. Random points (0-cells) join into edges
// (1-cells) when closer than the radius, and three points that are pairwise joined fill a
// triangle (a 2-cell). A range input with [data-ply-complex-radius] inside or targeting the
// element (for="id") changes the radius.
//
// Attributes: points (default 36), radius (0..0.5 of the width, default 0.16), seed, label.
// Event: "ply-complex-change" with detail { vertices, edges, triangles, radius }.

const NS = "http://www.w3.org/2000/svg";

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

class PlyComplex extends HTMLElement {
  static observedAttributes = ["radius", "points", "seed"];

  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.svg = document.createElementNS(NS, "svg");
    this.svg.setAttribute("viewBox", "0 0 100 56");
    this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    this.svg.setAttribute("aria-hidden", "true");
    this.gTri = document.createElementNS(NS, "g");
    this.gEdge = document.createElementNS(NS, "g");
    this.gRing = document.createElementNS(NS, "g");
    this.gPt = document.createElementNS(NS, "g");
    this.svg.append(this.gTri, this.gEdge, this.gRing, this.gPt);
    this.querySelector(".ply-complex__static")?.remove();
    this.append(this.svg);
    this.setAttribute("data-live", "");
    if (!this.hasAttribute("role")) this.setAttribute("role", "img");
    this._points();
    this._render();
    const id = this.id;
    const input = this.querySelector("[data-ply-complex-radius]") || (id && document.querySelector(`[data-ply-complex-radius][for="${id}"]`));
    if (input) input.addEventListener("input", () => this.setAttribute("radius", input.value));
    this.svg.addEventListener("pointermove", (e) => this._hover(e));
    this.svg.addEventListener("pointerleave", () => { this._hi = -1; this._ring(); });
  }

  attributeChangedCallback(name) {
    if (!this._ready) return;
    if (name !== "radius") this._points();
    this._render();
  }

  get radius() { return Math.max(0, Math.min(0.5, parseFloat(this.getAttribute("radius") ?? "0.16"))); }

  _points() {
    const n = Math.max(4, Math.min(120, parseInt(this.getAttribute("points") || "36", 10)));
    const rand = rng(parseInt(this.getAttribute("seed") || "7", 10));
    // jittered grid so points spread across the panel without clumping
    const cols = Math.ceil(Math.sqrt(n * 1.8)), rows = Math.ceil(n / cols);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      pts.push([6 + ((c + 0.15 + rand() * 0.7) / cols) * 88, 5 + ((r + 0.15 + rand() * 0.7) / rows) * 46]);
    }
    this.pts = pts;
  }

  _render() {
    const r = this.radius * 100;
    const p = this.pts;
    const n = p.length;
    const adj = Array.from({ length: n }, () => new Set());
    const edges = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]) <= r) { edges.push([i, j]); adj[i].add(j); adj[j].add(i); }
    }
    const tris = [];
    for (const [i, j] of edges) for (const k of adj[i]) if (k > j && adj[j].has(k)) tris.push([i, j, k]);

    this.gTri.replaceChildren(...tris.map(([a, b, c]) => {
      const el = document.createElementNS(NS, "polygon");
      el.setAttribute("points", `${p[a]} ${p[b]} ${p[c]}`);
      el.setAttribute("class", "ply-complex__tri");
      return el;
    }));
    this.gEdge.replaceChildren(...edges.map(([a, b]) => {
      const el = document.createElementNS(NS, "line");
      el.setAttribute("x1", p[a][0]); el.setAttribute("y1", p[a][1]);
      el.setAttribute("x2", p[b][0]); el.setAttribute("y2", p[b][1]);
      el.setAttribute("class", "ply-complex__edge");
      return el;
    }));
    this.gPt.replaceChildren(...p.map(([x, y]) => {
      const el = document.createElementNS(NS, "circle");
      el.setAttribute("cx", x); el.setAttribute("cy", y); el.setAttribute("r", 0.9);
      el.setAttribute("class", "ply-complex__pt");
      return el;
    }));
    this._ring();
    const detail = { vertices: n, edges: edges.length, triangles: tris.length, radius: this.radius };
    const label = this.getAttribute("label") || "A random complex";
    this.setAttribute("aria-label", `${label}: ${n} points, ${edges.length} edges, ${tris.length} filled triangles.`);
    this.querySelectorAll("[data-ply-complex-count]").forEach((el) => { el.textContent = String(detail[el.dataset.plyComplexCount] ?? ""); });
    this.dispatchEvent(new CustomEvent("ply-complex-change", { bubbles: true, detail }));
  }

  _hover(e) {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(this.svg.getScreenCTM().inverse());
    let best = -1, bd = 6;
    this.pts.forEach(([x, y], i) => { const d = Math.hypot(x - pt.x, y - pt.y); if (d < bd) { bd = d; best = i; } });
    if (best !== this._hi) { this._hi = best; this._ring(); }
  }

  _ring() {
    this.gRing.replaceChildren();
    if (this._hi == null || this._hi < 0) return;
    const [x, y] = this.pts[this._hi];
    const ring = document.createElementNS(NS, "circle");
    ring.setAttribute("cx", x); ring.setAttribute("cy", y); ring.setAttribute("r", this.radius * 100);
    ring.setAttribute("class", "ply-complex__ring");
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 1.5);
    dot.setAttribute("class", "ply-complex__hot");
    this.gRing.append(ring, dot);
  }
}

if (!customElements.get("ply-complex")) customElements.define("ply-complex", PlyComplex);
export { PlyComplex };
