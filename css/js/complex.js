// <ply-complex>: a live Vietoris-Rips complex. Random points (0-cells) join into edges
// (1-cells) when closer than the radius, and three points that are pairwise joined fill a
// triangle (a 2-cell). A range input with [data-ply-complex-radius] inside or targeting the
// element (for="id") changes the radius.
//
// Attributes: points (default 36), radius (0..0.5 of the width, default 0.16), seed, label,
// autoplay="none" (default) | "visible". With "visible" the complex grows on first view: the
// radius runs from 0 to its value, so points join into edges and edges fill into triangles,
// and a linked slider moves with it. It takes under three seconds and stops when the reader
// takes the slider. Under reduced motion it draws the finished complex.
// Event: "ply-complex-change" with detail { vertices, edges, triangles, radius }.

const NS = "http://www.w3.org/2000/svg";
const GROW_MS = 2600;
const DENSE = 2000;
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function path(d, cls) {
  const el = document.createElementNS(NS, "path");
  el.setAttribute("d", d);
  el.setAttribute("class", cls);
  return el;
}

// How many of the first n entries of a list in order of birth are born by radius r.
function upto(list, n, r) {
  let lo = 0, hi = n;
  while (lo < hi) { const m = (lo + hi) >> 1; if (list[m][0] <= r) lo = m + 1; else hi = m; }
  return lo;
}

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
    this._input = input || null;
    if (input) input.addEventListener("input", (e) => {
      // The growth moves the slider with synthetic input events; a real one hands it back.
      if (this._grow) { if (!e.isTrusted) return; this._stopGrow(false); }
      this.setAttribute("radius", input.value);
    });
    this.svg.addEventListener("pointermove", (e) => this._hover(e));
    this.svg.addEventListener("pointerleave", () => { this._hi = -1; this._ring(); });
    if (this.getAttribute("autoplay") === "visible" && !reduceMotion()) {
      // Wait as bare points until the reader sees it, then grow. Paper, and reduced motion
      // switched on mid-growth, get the finished complex.
      this._primeGrow();
      this._finish = () => { this._io?.disconnect(); this._stopGrow(); };
      this._rm = matchMedia("(prefers-reduced-motion: reduce)");
      this._onMotion = () => { if (this._rm.matches) this._finish(); };
      this._rm.addEventListener("change", this._onMotion);
      addEventListener("beforeprint", this._finish);
      if ("IntersectionObserver" in window) {
        this._io = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) { this._io.disconnect(); this._runGrow(); }
        }, { threshold: 0.4 });
        this._io.observe(this);
      } else this._runGrow();
    } else {
      // A reload can restore an old slider value, and a complex that would have grown starts
      // its slider and counts at 0; the drawn radius is the truth. Deferred, since the script
      // that prints the slider value and the counts may load after this one.
      queueMicrotask(() => { if (!this._grow) { this._syncInput(this.radius); this._render(); } });
    }
  }

  disconnectedCallback() {
    this._io?.disconnect();
    this._stopGrow();
    this._rm?.removeEventListener("change", this._onMotion);
    if (this._finish) removeEventListener("beforeprint", this._finish);
  }

  // Grow the complex from bare points to its radius, easing out like anything that arrives.
  _primeGrow() {
    this._grow = { target: this.radius, raf: 0 };
    this.setAttribute("radius", "0");
    // Page scripts that print the slider value and the counts may load after this one.
    queueMicrotask(() => { if (this._grow) { this._syncInput(0); this._render(); } });
  }

  _runGrow() {
    if (!this._grow) return;
    const { target } = this._grow;
    const t0 = performance.now();
    const step = (now) => {
      if (!this._grow) return;
      const t = Math.min(1, (now - t0) / GROW_MS);
      if (t === 1) { this._stopGrow(); return; }
      const r = target * (1 - Math.pow(1 - t, 3));
      this._syncInput(r);
      this.setAttribute("radius", r.toFixed(4));
      this._grow.raf = requestAnimationFrame(step);
    };
    this._grow.raf = requestAnimationFrame(step);
  }

  // restore: jump to the final radius; false when the reader's own value takes over.
  _stopGrow(restore = true) {
    if (!this._grow) return;
    cancelAnimationFrame(this._grow.raf);
    const { target } = this._grow;
    this._grow = null;
    if (restore) { this._syncInput(target); this.setAttribute("radius", String(target)); }
  }

  // Move a linked slider and let its own script print the value.
  _syncInput(r) {
    const input = this._input;
    if (!input) return;
    const was = input.value;
    input.value = String(r);
    // The slider snaps to its step, so most frames of the growth leave it where it was.
    if (input.value !== was) input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  attributeChangedCallback(name) {
    if (!this._ready) return;
    if (name !== "radius") this._points();
    this._render();
  }

  // An attribute that is not a number gets the default, so the figure is never left empty.
  get radius() { const r = parseFloat(this.getAttribute("radius") ?? "0.16"); return Number.isFinite(r) ? Math.max(0, Math.min(0.5, r)) : 0.16; }

  _points() {
    const n = Math.max(4, Math.min(120, parseInt(this.getAttribute("points") || "36", 10) || 36));
    const rand = rng(parseInt(this.getAttribute("seed") || "7", 10));
    // jittered grid so points spread across the panel without clumping
    const cols = Math.ceil(Math.sqrt(n * 1.8)), rows = Math.ceil(n / cols);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      pts.push([6 + ((c + 0.15 + rand() * 0.7) / cols) * 88, 5 + ((r + 0.15 + rand() * 0.7) / rows) * 46]);
    }
    this.pts = pts;
    // The filtration: every pair by length, so the edges at any radius are a prefix of it.
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]), i, j]);
    pairs.sort((a, b) => a[0] - b[0]);
    this._pairs = pairs;
    this._joined = 0;
    this._adj = Array.from({ length: n }, () => new Set());
    this._tris = [];
    const p = pts, tris = this._tris;
    this._lTri = {
      g: this.gTri, k: 0, els: [], path: null, dense: "ply-complex__tri ply-complex__tri--dense",
      make: (i) => {
        const [, a, b, c] = tris[i];
        const el = document.createElementNS(NS, "polygon");
        el.setAttribute("points", `${p[a]} ${p[b]} ${p[c]}`);
        el.setAttribute("class", "ply-complex__tri");
        return el;
      },
      d: (k) => { let d = ""; for (let i = 0; i < k; i++) { const [, a, b, c] = tris[i]; d += `M${p[a]}L${p[b]}L${p[c]}Z`; } return d; },
    };
    this._lEdge = {
      g: this.gEdge, k: 0, els: [], path: null, dense: "ply-complex__edge",
      make: (i) => {
        const [, a, b] = pairs[i];
        const el = document.createElementNS(NS, "line");
        el.setAttribute("x1", p[a][0]); el.setAttribute("y1", p[a][1]);
        el.setAttribute("x2", p[b][0]); el.setAttribute("y2", p[b][1]);
        el.setAttribute("class", "ply-complex__edge");
        return el;
      },
      d: (k) => { let d = ""; for (let i = 0; i < k; i++) { const [, a, b] = pairs[i]; d += `M${p[a]}L${p[b]}`; } return d; },
    };
    this.gTri.replaceChildren();
    this.gEdge.replaceChildren();
    this.gPt.replaceChildren(...p.map(([x, y]) => {
      const el = document.createElementNS(NS, "circle");
      el.setAttribute("cx", x); el.setAttribute("cy", y); el.setAttribute("r", 0.9);
      el.setAttribute("class", "ply-complex__pt");
      return el;
    }));
  }

  _render() {
    const r = this.radius * 100;
    this._join(r);
    const kE = upto(this._pairs, this._joined, r);
    const kT = upto(this._tris, this._tris.length, r);
    this._show(this._lTri, kT);
    this._show(this._lEdge, kE);
    this._ring();
    const n = this.pts.length;
    const detail = { vertices: n, edges: kE, triangles: kT, radius: this.radius };
    // The label names the finished complex; while it grows it keeps the one it will reach.
    if (!this._grow) {
      const label = this.getAttribute("label") || "A random complex";
      const text = `${label}: ${n} points, ${kE} edges, ${kT} filled triangles.`;
      if (this.getAttribute("aria-label") !== text) this.setAttribute("aria-label", text);
    }
    this.querySelectorAll("[data-ply-complex-count]").forEach((el) => {
      const v = String(detail[el.dataset.plyComplexCount] ?? "");
      if (el.textContent !== v) el.textContent = v;
    });
    this.dispatchEvent(new CustomEvent("ply-complex-change", { bubbles: true, detail }));
  }

  // Join pairs into edges, shortest first, up to radius r. A triangle is born with its
  // longest edge, so it is listed when that edge joins and the list stays in order of birth.
  _join(r) {
    const pairs = this._pairs, adj = this._adj;
    while (this._joined < pairs.length && pairs[this._joined][0] <= r) {
      const [d, i, j] = pairs[this._joined++];
      const [small, big] = adj[i].size < adj[j].size ? [adj[i], adj[j]] : [adj[j], adj[i]];
      for (const k of small) if (big.has(k)) this._tris.push([d, i, j, k]);
      adj[i].add(j); adj[j].add(i);
    }
  }

  // Show the first k cells of a layer. Cells stay in the DOM in order of birth, so a new radius
  // adds or removes only the cells born in between. Each triangle is its own shape so overlaps
  // stack into deeper mustard. Past DENSE the overlaps are solid anyway, and one path per layer
  // keeps a 120-point complex responsive.
  _show(L, k) {
    if (k === L.k) return;
    if (k > DENSE) {
      L.path ??= path("", L.dense);
      L.path.setAttribute("d", L.d(k));
      if (L.k <= DENSE) L.g.replaceChildren(L.path);
    } else {
      while (L.els.length < k) L.els.push(L.make(L.els.length));
      if (L.k > DENSE) L.g.replaceChildren(...L.els.slice(0, k));
      else if (k > L.k) L.g.append(...L.els.slice(L.k, k));
      else for (let i = k; i < L.k; i++) L.els[i].remove();
    }
    L.k = k;
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
