// <ply-machine>: a live probability machine (Galton board).
// Each ball takes `rows` independent left/right bounces with probability `p` of going right,
// so the bins fill with a Binomial(rows, p) histogram. The markup inside the element is the
// no-JavaScript fallback; this script replaces it with a canvas once it runs.
//
// Attributes: rows (default 8), balls (default 30), p (default 0.5), label, interactive,
// autoplay="visible" (default) | "none".
// Methods: run(animate = true) drops a fresh set; settle() jumps to the end of the current set. Event: "ply-machine-done" with detail { counts }.

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function sample(rows, balls, p) {
  const paths = [];
  const counts = new Array(rows + 1).fill(0);
  for (let i = 0; i < balls; i++) {
    const steps = [];
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const right = Math.random() < p;
      steps.push(right);
      if (right) k++;
    }
    paths.push({ steps, bin: k, slot: counts[k]++ });
  }
  return { paths, counts };
}

class PlyMachine extends HTMLElement {
  static observedAttributes = ["rows", "balls", "p"];

  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.append(this.canvas);
    this.setAttribute("data-live", "");
    this.ctx = this.canvas.getContext("2d");

    const label = this.getAttribute("label") || "Probability machine: balls bounce left or right at each peg and pile into a bell curve.";
    if (this.hasAttribute("interactive")) {
      this.setAttribute("role", "button");
      this.tabIndex = 0;
      this.setAttribute("aria-label", `${label} Press to run it again.`);
      this.addEventListener("click", () => this.run());
      this.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.run(); }
      });
      this.style.cursor = "pointer";
    } else {
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", label);
    }

    this._ro = new ResizeObserver(() => { this._resize(); this._draw(); });
    this._ro.observe(this);
    this._mq = matchMedia("(prefers-color-scheme: dark)");
    this._onTheme = () => { this._readColors(); this._draw(); };
    this._mq.addEventListener("change", this._onTheme);
    this._mo = new MutationObserver(this._onTheme);
    this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    this._readColors();
    this._resize();
    this._prepare();
    if (reduceMotion() || this.getAttribute("autoplay") === "none") {
      this.settle();
    } else {
      this._io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { this._io.disconnect(); this.run(); }
      }, { threshold: 0.3 });
      this._io.observe(this);
      this._draw();
    }
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    this._ro?.disconnect();
    this._io?.disconnect();
    this._mo?.disconnect();
    this._mq?.removeEventListener("change", this._onTheme);
  }

  attributeChangedCallback() {
    if (!this._ready) return;
    this._prepare();
    this.settle();
  }

  get rows() { return Math.max(2, Math.min(16, parseInt(this.getAttribute("rows") || "8", 10))); }
  get balls() { return Math.max(1, Math.min(400, parseInt(this.getAttribute("balls") || "30", 10))); }
  get p() { const v = parseFloat(this.getAttribute("p") ?? "0.5"); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5; }

  _readColors() {
    const cs = getComputedStyle(this);
    const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    this.colors = {
      peg: get("--_peg", "#F6F7F6"),
      wall: get("--_wall", "#4A4A47"),
      ball: get("--_ball", "#D9412B"),
      funnel: get("--_funnel", "#E9A81C"),
    };
  }

  _resize() {
    const rect = this.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _geometry() {
    const { w, h, rows } = this;
    const bins = rows + 1;
    const left = 0.18 * w;
    const binW = (0.64 * w) / bins;
    const cx = w / 2;
    const pegTop = 0.17 * h;
    const pegH = 0.36 * h;
    const dy = pegH / Math.max(1, rows - 1);
    const floor = h * 0.955;
    const binTop = floor - 0.37 * h;
    const maxCount = Math.max(1, ...this.sim.counts);
    const d = Math.min(binW * 0.3, (floor - binTop) / maxCount);
    return { bins, left, binW, cx, pegTop, dy, floor, binTop, d, pegR: Math.max(1.5, 0.0055 * w) };
  }

  _prepare() {
    this.sim = sample(this.rows, this.balls, this.p);
    this.landed = new Array(this.rows + 1).fill(0);
    this.active = [];
  }

  // Position of a ball `t` seconds after release, or null once it has landed.
  _pos(path, t, g) {
    const seg = 0.075; // seconds per peg row
    const rows = this.rows;
    let k = 0;
    const startY = 0.135 * this.h;
    if (t < seg) {
      const u = t / seg;
      return [g.cx, startY + (g.pegTop - g.d / 2 - startY) * u * u];
    }
    let r = Math.floor(t / seg) - 1;
    for (let i = 0; i < Math.min(r, rows); i++) if (path.steps[i]) k++;
    if (r < rows - 1) {
      const u = t / seg - (r + 1);
      const x0 = g.cx + (k - r / 2) * g.binW;
      const x1 = x0 + (path.steps[r] ? 0.5 : -0.5) * g.binW;
      const y0 = g.pegTop + r * g.dy - g.d / 2;
      const y1 = y0 + g.dy;
      return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u * u - 4 * (g.dy * 0.22) * u * (1 - u)];
    }
    // last bounce off the bottom row, then the drop into the bin
    let kPrev = 0;
    for (let i = 0; i < rows - 1; i++) if (path.steps[i]) kPrev++;
    const x0 = g.cx + (kPrev - (rows - 1) / 2) * g.binW;
    const lastX = g.cx + (path.bin - rows / 2) * g.binW;
    const y0 = g.pegTop + (rows - 1) * g.dy - g.d / 2;
    const yEnd = g.floor - g.d / 2 - path.slot * g.d;
    const fall = Math.max(seg, Math.sqrt(Math.max(0, yEnd - y0) / (this.h * 3.2)));
    const u = (t - seg * rows) / fall;
    if (u >= 1) return null;
    return [x0 + (lastX - x0) * Math.min(1, u * 2.5), y0 + (yEnd - y0) * u * u];
  }

  // Drop a fresh set of balls. run(false) samples new flips and jumps to the settled pile.
  run(animate = true) {
    cancelAnimationFrame(this._raf);
    this._prepare();
    if (!animate || reduceMotion()) { this.settle(); return; }
    const g = this._geometry();
    const spacing = 0.085;
    const start = performance.now();
    const total = this.sim.paths.length;
    let next = 0;
    const tick = (now) => {
      const t = (now - start) / 1000;
      while (next < total && t >= next * spacing) this.active.push({ path: this.sim.paths[next], born: next++ * spacing });
      this.active = this.active.filter((b) => {
        const p = this._pos(b.path, t - b.born, g);
        if (!p) { this.landed[b.path.bin]++; return false; }
        b.xy = p;
        return true;
      });
      this._draw(g);
      if (next < total || this.active.length) this._raf = requestAnimationFrame(tick);
      else this._done();
    };
    this._raf = requestAnimationFrame(tick);
  }

  settle() {
    cancelAnimationFrame(this._raf);
    this.active = [];
    this.landed = this.sim.counts.slice();
    this._draw();
    this._done();
  }

  _done() {
    this.dispatchEvent(new CustomEvent("ply-machine-done", { bubbles: true, detail: { counts: this.sim.counts.slice() } }));
  }

  _draw(g = this._geometry()) {
    const { ctx, w, h, colors, rows } = this;
    ctx.clearRect(0, 0, w, h);

    // funnel
    ctx.fillStyle = colors.funnel;
    const fw = 0.17 * w, fx = g.cx - fw / 2, fy = 0.05 * h, fh = 0.085 * h;
    ctx.beginPath();
    ctx.moveTo(fx, fy); ctx.lineTo(fx + fw, fy); ctx.lineTo(fx + fw * 0.6, fy + fh); ctx.lineTo(fx + fw * 0.4, fy + fh);
    ctx.closePath(); ctx.fill();

    // pegs
    ctx.fillStyle = colors.peg;
    for (let r = 0; r < rows; r++) {
      for (let j = 0; j <= r; j++) {
        ctx.beginPath();
        ctx.arc(g.cx + (j - r / 2) * g.binW, g.pegTop + r * g.dy, g.pegR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // bin walls and floor
    ctx.fillStyle = colors.wall;
    for (let k = 0; k <= g.bins; k++) ctx.fillRect(g.left + k * g.binW - 1, g.binTop, 2, g.floor - g.binTop);
    ctx.fillStyle = colors.peg;
    ctx.fillRect(g.left - 1, g.floor, g.bins * g.binW + 2, 3);

    // landed balls
    ctx.fillStyle = colors.ball;
    const r = g.d * 0.44;
    for (let k = 0; k < g.bins; k++) {
      const x = g.left + (k + 0.5) * g.binW;
      for (let s = 0; s < this.landed[k]; s++) {
        ctx.beginPath();
        ctx.arc(x, g.floor - g.d / 2 - s * g.d, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // falling balls
    for (const b of this.active) {
      if (!b.xy) continue;
      ctx.beginPath();
      ctx.arc(b.xy[0], b.xy[1], r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

if (!customElements.get("ply-machine")) customElements.define("ply-machine", PlyMachine);
export { PlyMachine };
