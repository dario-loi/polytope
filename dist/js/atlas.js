// <ply-atlas>: a globe of the places in a CV, beside the entries that happened there.
// astro/Atlas.astro prints:
//   <ply-atlas class="ply-atlas" label="Where I studied and worked">
//     <div class="ply-atlas__frame">
//       <div class="ply-atlas__stage"><div class="ply-atlas__map" data-surface="panel">
//         <svg class="ply-atlas__static">the server-drawn globe</svg></div></div>
//       <div class="ply-atlas__list">
//         <div class="ply-segmented ply-atlas__filter" hidden></div>
//         <ol class="ply-atlas__stops">
//           <li class="ply-atlas__stop" data-place="Lisbon, Portugal" data-lat="38.72" data-lon="-9.14"
//             data-from="2016-09" data-kind="Education"> ... <p class="ply-atlas__place">...</p> </li>
//         </ol></div></div>
//   </ply-atlas>
// Side by side, the entry whose top crosses a line 45% down the viewport is current; stacked,
// the topmost entry showing below the pinned globe is. The globe turns to its place and the
// tomato ball travels there; past the last entry it pulls back to every place. A pin, or an
// entry's place line, picks that entry. Drag turns the globe, Ctrl or Cmd and scroll or a
// pinch zooms, and the buttons zoom and show every place. Under reduced motion it jumps.
// Event: "ply-atlas-change" with detail { index, place } when the current entry changes.

const NS = "http://www.w3.org/2000/svg";
const LAYERS = ["sea", "grid", "land", "coast", "visited", "border", "limb", "route", "trail"];
const ICONS = {
  in: "M12 5v14M5 12h14",
  out: "M5 12h14",
  all: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c-3.5 3.5-3.5 14.5 0 18M12 3c3.5 3.5 3.5 14.5 0 18",
};
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// What counts as the reader starting to read, for loading the close outlines.
const MOVES = ["scroll", "wheel", "pointerdown", "keydown", "touchstart"];
const mac = () => /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent);

// Modules shared by every atlas on the page, fetched when the first one connects.
let core, coarse, fine;
const loadCore = () => (core ??= import("./atlas-core.js"));
const loadCoarse = () => (coarse ??= Promise.all([loadCore(), import("./atlas-world-110m.js")]).then(([c, m]) => c.decodeSliced(m.default, pause)));
const loadFine = () => (fine ??= Promise.all([loadCore(), import("./atlas-world-50m.js")]).then(([c, m]) => c.decodeSliced(m.default, pause)));

// Gives the page a turn between slices of work, so decoding the map and drawing its first frame
// never hold up a click or a scroll for long.
const pause = () => (globalThis.scheduler?.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

function el(tag, cls, parent) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  parent?.append(node);
  return node;
}

function icon(d) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", d);
  svg.append(p);
  return svg;
}

class PlyAtlas extends HTMLElement {
  connectedCallback() {
    if (this._ready) { this._attach(); return; }
    this._ready = true;
    this.map = this.querySelector(".ply-atlas__map");
    this.list = this.querySelector(".ply-atlas__stops");
    if (!this.map || !this.list) return;
    this.stops = [...this.list.querySelectorAll(".ply-atlas__stop")].map((li) => ({
      el: li,
      place: li.dataset.place || "",
      lon: parseFloat(li.dataset.lon),
      lat: parseFloat(li.dataset.lat),
      from: li.dataset.from,
      kind: li.dataset.kind || "",
      zoom: parseFloat(li.dataset.zoom) || 0,
    }));
    this.current = -1;
    this._followed = null;
    this._ptrs = new Map();
    this._build();
    loadCore().then((c) => {
      this.core = c;
      const { places } = c.chart(this.stops);
      this.places = places;
      this._pins();
      this._filter("");
      return pause().then(loadCoarse);
    }).then((world) => this._dress(world)).then((world) => {
      if (!this.isConnected) return;
      this._coarse = world;
      this._start();
    }).catch((err) => console.warn("[polytope] atlas: could not load the map", err));
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    cancelAnimationFrame(this._frame);
    this._raf = this._frame = 0;
    this._halt?.();
    this._ro?.disconnect();
    this._mo?.disconnect();
    this._io?.disconnect();
    for (const t of MOVES) removeEventListener(t, this._onMove);
    for (const [target, type, fn] of this._global ?? []) target.removeEventListener(type, fn);
  }

  // Page-wide listeners: scroll drives the story, and theme changes repaint the canvas.
  _attach() {
    for (const [target, type, fn] of this._global) target.addEventListener(type, fn, { passive: true });
    this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    this._ro.observe(this.map);
  }

  // ------------------------------------------------------------- setup

  _build() {
    const map = this.map;
    map.tabIndex = 0;
    map.setAttribute("role", "group");
    map.setAttribute("aria-roledescription", "map");
    const label = this.getAttribute("label") || "Places";
    map.setAttribute("aria-label", `${label}. Arrow keys turn the globe, plus and minus zoom.`);
    this.canvas = el("canvas", "ply-atlas__canvas", map);
    this.canvas.setAttribute("aria-hidden", "true");
    this.ctx = this.canvas.getContext("2d");
    this.layer = el("div", "ply-atlas__pins", map);
    this.here = el("span", "ply-atlas__here", this.layer);
    this.here.hidden = true;
    this.tag = el("span", "ply-atlas__tag", this.layer);
    this.tag.setAttribute("aria-hidden", "true");
    this.tag.hidden = true;
    this.readout = el("p", "ply-atlas__readout", map);
    this.readout.setAttribute("aria-hidden", "true");
    const controls = this.controls = el("div", "ply-atlas__controls", map);
    for (const [name, text, fn] of [["in", "Zoom in", () => this._zoomBy(2)], ["out", "Zoom out", () => this._zoomBy(0.5)], ["all", "Show every place", () => this._showAll()]]) {
      const b = el("button", "", controls);
      b.type = "button";
      b.setAttribute("aria-label", text);
      b.title = text;
      b.append(icon(ICONS[name]));
      b.addEventListener("click", fn);
    }
    this._probe = el("span", "ply-atlas__ink", map);
    // The caption under the globe says how to turn it, once it can turn.
    this.stage = this.querySelector(".ply-atlas__stage");
    const caption = this.querySelector(".ply-atlas__caption");
    if (caption) {
      this.capLead = caption.querySelector("b");
      this.capTally = caption.querySelector(".ply-atlas__tally");
      this._label = this.capLead?.textContent ?? "";
      if (!this.capLead || !this.capTally) this.capLead = null;
      this.capHint = el("span", "ply-atlas__hint", caption);
      this.capHint.textContent = matchMedia("(pointer: coarse)").matches ? " Drag sideways to turn the globe, pinch to zoom." : " Drag to turn the globe.";
    }

    // Each entry's place line becomes a button that shows it on the map.
    this.stops.forEach((s, i) => {
      const line = s.el.querySelector(".ply-atlas__place");
      if (!line) return;
      const b = el("button", "ply-atlas__go");
      b.type = "button";
      b.append(...line.childNodes);
      const hint = el("span", "ply-visually-hidden", b);
      hint.textContent = " (show on the map)";
      line.append(b);
      b.addEventListener("click", () => { this._followed = this._pick(); this.select(i); });
    });

    map.addEventListener("pointerdown", (e) => this._down(e));
    map.addEventListener("pointermove", (e) => this._move(e));
    for (const t of ["pointerup", "pointercancel", "lostpointercapture"]) map.addEventListener(t, (e) => this._up(e));
    map.addEventListener("wheel", (e) => this._wheel(e), { passive: false });
    map.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) this._zoomBy(2, e.clientX, e.clientY); });
    map.addEventListener("keydown", (e) => this._key(e));

    const scroll = () => {
      if (this._frame) return;
      this._frame = requestAnimationFrame(() => { this._frame = 0; this._follow(); });
    };
    const theme = () => { this._colors = null; this._paint(); };
    this._global = [[window, "scroll", scroll], [window, "resize", scroll]];
    for (const q of ["(prefers-color-scheme: dark)", "(forced-colors: active)", "print"]) this._global.push([matchMedia(q), "change", theme]);
    this._mo = new MutationObserver(theme);
    this._ro = new ResizeObserver(() => this._resize());
    this._attach();
  }

  _pins() {
    this.pinEls = this.places.map((p, n) => {
      const b = el("button", "ply-atlas__pin", this.layer);
      b.type = "button";
      b.tabIndex = -1;
      b.setAttribute("aria-label", p.name);
      b.hidden = true;
      b.addEventListener("click", () => this._reveal(n));
      const name = el("span", "ply-atlas__name", this.layer);
      name.textContent = p.name;
      name.setAttribute("aria-hidden", "true");
      p.pin = b;
      p.label = name;
      return b;
    });
    this.layer.append(this.here, this.tag);
    // Filter buttons for each kind of entry, in the order they first appear.
    const box = this.querySelector(".ply-atlas__filter");
    const kinds = [...new Set(this.stops.map((s) => s.kind).filter(Boolean))];
    if (box && kinds.length > 1 && !box.children.length) {
      if (!box.getAttribute("aria-label")) box.setAttribute("aria-label", "Show entries");
      box.setAttribute("role", "group");
      for (const kind of ["", ...kinds]) {
        const b = el("button", "", box);
        b.type = "button";
        b.textContent = kind || "All";
        b.dataset.kind = kind;
        b.addEventListener("click", () => this._filter(kind));
      }
      box.hidden = false;
    }
  }

  _start() {
    this._resize();
    this.view = this.core.overview(this._shown(), this._w, this._h);
    this._live = true;
    this._readout();
    this._follow();
    // The server's globe stays up until the first frame is whole; a flight that starts first
    // draws its own frames, and those count.
    if (!this._anim) this._firstFrame();
    // The close outlines are needed as soon as the reader reaches an entry: once the globe is
    // near the screen and the reader has scrolled, pointed, or pressed a key. On load they would
    // only compete with the page, and a view that needs them sooner asks in _draw.
    const go = () => { if (this._near && this._moved) this._fine(); };
    this._onMove = () => {
      for (const t of MOVES) removeEventListener(t, this._onMove);
      this._moved = true; go();
    };
    for (const t of MOVES) addEventListener(t, this._onMove, { passive: true });
    this._io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { this._io.disconnect(); this._near = true; go(); }
    }, { rootMargin: "600px 0px" });
    this._io.observe(this);
    // The labels are measured in the fonts they show in; when those arrive, only the labels move.
    document.fonts?.ready.then(() => {
      this._measured = false;
      if (this.view && !this._raf) this._place(this.core.projection(this._w, this._h, this.view));
    });
  }

  _fine() {
    if (this._fineLoading) return;
    this._fineLoading = true;
    loadFine().then((world) => this._dress(world)).then((world) => {
      this._detail = world;
      this._paint();
    }).catch(() => {});
  }

  // A dataset with the countries that hold a place, split into parts for culling.
  async _dress(world) {
    const visited = await this.core.visitedSliced(world.countries, this.places, pause);
    return { ...world, visitedParts: visited.flatMap((g) => this.core.parts(g)) };
  }

  _resize() {
    const r = this.map.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === this._w && h === this._h && dpr === this._dpr) return;
    this._w = w; this._h = h; this._dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    if (this._live && this.current < 0 && !this._flight) this.view = this.core.overview(this._shown(), w, h);
    this._paint();
  }

  // Layer colors from the CSS, resolved through a probe so themes, print, and contrast
  // themes all reach the canvas.
  _readColors() {
    const cs = getComputedStyle(this.map);
    const colors = {};
    for (const name of LAYERS) {
      this._probe.style.color = `var(--_${name})`;
      colors[name] = { color: getComputedStyle(this._probe).color, a: parseFloat(cs.getPropertyValue(`--_${name}-a`)) || 1 };
    }
    this._colors = colors;
  }

  _shown() { return this.places.filter((p) => p.stops.some((i) => !this.stops[i].el.hidden)); }

  // ------------------------------------------------------------- drawing

  _paint() {
    if (this._raf || !this._live) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this._draw(); });
  }

  // A whole frame at once. It replaces a first frame still being drawn in slices.
  _draw() {
    this._slices = null;
    for (const _ of this._layers(false));
  }

  // The first frame, drawn a few layers at a time, then shown in place of the server's globe.
  async _firstFrame() {
    const token = this._slices = {};
    const steps = this._layers(true);
    let t = performance.now();
    while (this._slices === token && !steps.next().done) {
      if (performance.now() - t > 4) { await pause(); t = performance.now(); }
    }
    if (this._slices === token) this._slices = null;
  }

  *_layers(sliced) {
    const { core, ctx } = this;
    const w = this._w, h = this._h;
    if (!w || !h || !this._coarse) return;
    if (!this._colors) this._readColors();
    if (this.view.k >= core.DETAIL && !this._detail) this._fine();
    const world = this.view.k >= core.DETAIL && this._detail ? this._detail : this._coarse;
    const c = this._colors;
    const proj = core.projection(w, h, this.view);
    const path = core.geoPath(proj, ctx);
    // The outlines are dense already, so they skip d3's resampling, which is a third of a
    // frame; the sphere, the graticule, and the route's long arcs keep it.
    const outline = core.geoPath(core.projection(w, h, this.view).precision(0), ctx);
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = "round";
    const fill = (name, draw, ...shapes) => {
      ctx.beginPath();
      for (const s of shapes) draw(s);
      ctx.globalAlpha = c[name].a; ctx.fillStyle = c[name].color; ctx.fill();
    };
    const stroke = (name, width, draw, ...shapes) => {
      ctx.beginPath();
      for (const s of shapes) draw(s);
      ctx.globalAlpha = c[name].a; ctx.strokeStyle = c[name].color; ctx.lineWidth = width; ctx.stroke();
    };
    const v = this.view;
    fill("sea", path, core.sphere);
    yield;
    stroke("grid", 1, path, core.graticule);
    yield;
    if (world.visitedParts.length) fill("visited", outline, core.cull(world.visitedParts, v, w, h, "MultiPolygon"));
    yield;
    // The land is drawn in chalk, like the complex: a faint fill, then its coast on the same path.
    // Land polygons never touch, so a frame in slices fills them a few at a time with the same
    // result. Countries do touch, so the visited fill and the borders stay one path each.
    const land = core.cull(world.landParts, v, w, h, "MultiPolygon").coordinates;
    const batch = sliced ? 8 : Math.max(1, land.length);
    for (let i = 0; i < land.length; i += batch) {
      fill("land", outline, { type: "MultiPolygon", coordinates: land.slice(i, i + batch) });
      ctx.globalAlpha = c.coast.a; ctx.strokeStyle = c.coast.color; ctx.lineWidth = 1; ctx.stroke();
      yield;
    }
    stroke("border", 0.75, outline, core.cull(world.borderParts, v, w, h, "MultiLineString"));
    yield;
    stroke("limb", 1.5, path, core.sphere);
    stroke("route", 1.5, path, this._route);
    if (this._trace) {
      ctx.lineCap = "round";
      ctx.beginPath();
      path({ type: "MultiLineString", coordinates: this._trace.lines });
      ctx.globalAlpha = c.trail.a * this._trace.alpha; ctx.strokeStyle = c.trail.color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.lineCap = "butt";
    }
    if (this._trail) {
      ctx.lineCap = "round";
      ctx.beginPath();
      path({ type: "LineString", coordinates: [this._trail.from, this._trail.to] });
      ctx.globalAlpha = c.trail.a * this._trail.alpha; ctx.strokeStyle = c.trail.color; ctx.lineWidth = 3; ctx.stroke();
      ctx.lineCap = "butt";
    }
    ctx.globalAlpha = 1;
    // Live before placing, so the names keep clear of the controls it shows.
    if (!this.hasAttribute("data-live")) this.setAttribute("data-live", "");
    this._place(proj);
  }

  // Pins, the ball, and the labels sit over the canvas as elements, so they stay sharp text
  // and real buttons. Names that would collide with one already placed stay hidden.
  _place(proj) {
    const { core } = this;
    const w = this._w, h = this._h;
    if (!this._measured) {
      for (const p of this.places) { p.label.hidden = false; p.lw = p.label.offsetWidth; p.lh = p.label.offsetHeight; }
      this._measured = true;
    }
    const cur = this.stops[this.current];
    const here = cur ? this.places[cur.at] : null;
    // The controls and the readout are taken; names keep clear of them.
    const boxes = [this.controls, this.readout].filter((n) => n.offsetWidth).map((n) => [n.offsetLeft, n.offsetTop, n.offsetLeft + n.offsetWidth, n.offsetTop + n.offsetHeight]);
    const overlaps = (b) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const flying = Boolean(this._flight?.leg);

    const drop = this._drop ? this._drop() : 0;
    if (this._ball && drop !== null && core.shows(proj, this.view, this._ball, w, h, -24)) {
      const [x, y] = proj(this._ball);
      this.here.style.transform = `translate(${x}px, ${y - drop}px)`;
      this.here.toggleAttribute("data-moving", flying || drop > 0);
      this.here.hidden = false;
      boxes.push([x - 12, y - 12, x + 12, y + 12]);
    } else this.here.hidden = true;

    if (here && !flying && core.shows(proj, this.view, [here.lon, here.lat], w, h, -8)) {
      const [x, y] = proj([here.lon, here.lat]);
      if (this.tag.textContent !== here.name) { this.tag.textContent = here.name; this.tag.hidden = false; this._tw = this.tag.offsetWidth; this._th = this.tag.offsetHeight; }
      // Right of the ball, else left, else centered under it, always inside the panel.
      const tw = this._tw, th = this._th;
      let tx = x + 18, ty = y - th / 2;
      if (tx + tw > w - 8) tx = x - 18 - tw;
      if (tx < 8) { tx = Math.max(8, Math.min(w - 8 - tw, x - tw / 2)); ty = y + 18; }
      this.tag.style.transform = `translate(${tx}px, ${ty}px)`;
      this.tag.hidden = false;
      boxes.push([tx - 4, ty - 4, tx + tw + 4, ty + th + 4]);
    } else this.tag.hidden = true;

    // Pins first, then names in order of how many entries they hold.
    const order = [];
    this.places.forEach((p, n) => {
      const ok = core.shows(proj, this.view, [p.lon, p.lat], w, h, -10);
      p.pin.hidden = !ok;
      if (!ok) { p.label.hidden = true; return; }
      const [x, y] = proj([p.lon, p.lat]);
      p.x = x; p.y = y;
      p.pin.style.transform = `translate(${x}px, ${y}px)`;
      p.pin.toggleAttribute("data-current", p === here);
      boxes.push([x - 7, y - 7, x + 7, y + 7]);
      order.push(p);
    });
    order.sort((a, b) => b.stops.length - a.stops.length);
    for (const p of order) {
      if (p === here && !flying) { p.label.hidden = true; continue; }
      const right = [p.x + 12, p.y - p.lh / 2, p.x + 12 + p.lw, p.y + p.lh / 2];
      const left = [p.x - 12 - p.lw, right[1], p.x - 12, right[3]];
      const fits = (b) => b[0] >= 4 && b[2] <= w - 4 && b[1] >= 4 && b[3] <= h - 4 && !overlaps(b);
      const box = fits(right) ? right : fits(left) ? left : null;
      p.label.hidden = !box || p.pin.hasAttribute("data-out");
      if (!p.label.hidden) { p.label.style.transform = `translate(${box[0]}px, ${box[1]}px)`; boxes.push(box); }
    }
  }

  _readout(text) {
    const cur = this.stops[this.current];
    const here = cur ? this.places[cur.at] : null;
    if (text) this.readout.textContent = text;
    else this.readout.textContent = here ? this.core.coords(here.lon, here.lat) : "";
    this.readout.toggleAttribute("data-hint", Boolean(text));
  }

  // ------------------------------------------------------------- story

  // Side by side, the reading line is 45% down the screen. Stacked, the pinned globe covers
  // the top of the screen, so the line is just under it, where the stage sits once stuck.
  _stacked() {
    const m = this.map.getBoundingClientRect();
    const l = this.list.getBoundingClientRect();
    return m.right > l.left && m.left < l.right;
  }

  _line() {
    return this._stacked() ? (this.stage?.offsetHeight ?? 0) + 24 : innerHeight * 0.45;
  }

  // The entry the reader is on. Side by side: the last one whose top has crossed the line,
  // or at the end of the list the last one on screen, since it may never reach the line.
  // Stacked: the topmost entry that shows below the globe, so the one the globe names is the
  // one the reader can read.
  _pick() {
    const line = this._line();
    const open = this.stops.map((s, i) => [s, i]).filter(([s]) => !s.el.hidden);
    // Past the last entry the reader has finished: the globe pulls back to the whole route.
    const END = -2;
    if (this._stacked()) {
      for (const [s, i] of open) {
        const r = s.el.getBoundingClientRect();
        if (r.bottom > line + 48) return r.top < innerHeight * 0.85 ? i : -1;
      }
      return open.length ? END : -1;
    }
    if (open.length && this.list.getBoundingClientRect().bottom < line) return END;
    let pick = -1;
    const end = this.list.getBoundingClientRect().bottom <= innerHeight + 1;
    for (const [s, i] of open) {
      const top = s.el.getBoundingClientRect().top;
      if (top <= line || (end && top < innerHeight)) pick = i;
      else break;
    }
    return pick;
  }

  // The caption names the current entry, or the whole map when there is none.
  _caption(s) {
    if (!this.capLead) return;
    const text = (sel) => s.el.querySelector(sel)?.textContent.replace(/\s+/g, " ").trim().replace(/\.$/, "");
    if (s) {
      this.capLead.textContent = `${text(".ply-atlas__title")}.`;
      const rest = [text(".ply-atlas__org"), text(".ply-atlas__when")].filter(Boolean).join(", ");
      this.capTally.textContent = rest ? `${rest}.` : "";
    } else {
      this.capLead.textContent = this._label;
      this.capTally.textContent = this._tally ?? this.capTally.textContent;
    }
    if (this.capHint) this.capHint.hidden = Boolean(s);
  }

  _follow() {
    if (!this._live || this._hold) return;
    const pick = this._pick();
    if (pick === this._followed) return;
    this._followed = pick;
    if (pick === -2) {
      // The first finish on screen traces the route; later ones only pull back.
      const r = this.map.getBoundingClientRect();
      const seen = r.bottom > 0 && r.top < innerHeight;
      this._traceNext = seen && !this._traced;
      if (this._traceNext) this._traced = true;
    }
    this.select(pick < 0 ? -1 : pick);
  }

  // Make entry i current and fly to its place; -1 shows every place.
  select(i) {
    if (!this._live) return;
    if (i === this.current) return;
    this.current = i;
    this.stops.forEach((s, n) => s.el.toggleAttribute("data-current", n === i));
    const s = this.stops[i];
    const { core } = this;
    if (!s) {
      this._ball = null;
      const trace = this._traceNext;
      this._traceNext = false;
      this._fly(core.overview(this._shown(), this._w, this._h), undefined, trace ? () => this._traceRoute() : null);
    } else {
      const p = this.places[s.at];
      this._fly({ lon: p.lon, lat: p.lat, k: Math.max(core.ZOOM.min, Math.min(core.ZOOM.max, s.zoom || core.ZOOM.stop)) }, [p.lon, p.lat]);
    }
    this._readout();
    this._caption(s);
    this.dispatchEvent(new CustomEvent("ply-atlas-change", { bubbles: true, detail: { index: i, place: s ? s.place : null } }));
  }

  // A pin picks the next entry at its place and scrolls it to the reading line. The scroll
  // would pass other entries on the way, so following waits until it ends.
  _reveal(n) {
    const p = this.places[n];
    const open = p.stops.filter((i) => !this.stops[i].el.hidden);
    if (!open.length) return;
    const i = open[(open.indexOf(this.current) + 1) % open.length];
    const top = this.stops[i].el.getBoundingClientRect().top + scrollY - this._line() + 4;
    this._hold = true;
    this._followed = i;
    this.select(i);
    clearTimeout(this._holdTimer);
    const release = () => { clearTimeout(this._holdTimer); this._hold = false; this._followed = this._pick(); };
    if ("onscrollend" in window) addEventListener("scrollend", release, { once: true });
    this._holdTimer = setTimeout(release, 1500);
    scrollTo({ top: Math.max(0, top), behavior: reduceMotion() ? "auto" : "smooth" });
  }

  _filter(kind) {
    this.kind = kind;
    this.querySelectorAll(".ply-atlas__filter [data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
    this.stops.forEach((s) => { s.el.hidden = Boolean(kind) && s.kind !== kind; });
    for (const p of this.places ?? []) p.pin?.toggleAttribute("data-out", p.stops.every((i) => this.stops[i].el.hidden));
    const shown = this.core.chart(this.stops.filter((s) => !s.el.hidden).map((s) => ({ ...s })));
    this._route = shown.route;
    this._tally = this.core.tally(this._shown().length, shown.moves);
    if (this.capTally && this.current < 0) this.capTally.textContent = this._tally;
    if (!this._live) return;
    if (this.stops[this.current]?.el.hidden) { this.current = -1; this._ball = null; this._caption(null); }
    this._followed = null;
    this._follow();
    if (this.current < 0) this._fly(this.core.overview(this._shown(), this._w, this._h));
    this._paint();
  }

  // ------------------------------------------------------------- motion

  // Fly to a view. With a place, the ball travels the great circle to it from wherever it
  // is, drawing a tomato trail that fades once it lands; with no ball yet, it drops in.
  _fly(view, to, done) {
    const { core } = this;
    this._halt();
    const from = this._ball;
    const f = core.flight(this.view, view, this._w, this._h);
    if (!f.duration || reduceMotion() || document.hidden) {
      this.view = view;
      this._ball = to ?? null;
      this._trail = null;
      this._paint();
      if (!reduceMotion()) done?.();
      return;
    }
    const leg = from && to && core.geoDistance(from, to) > 1e-4 ? core.geoInterpolate(from, to) : null;
    const t0 = performance.now();
    this._flight = { leg, to, view };
    if (to && !from) {
      // The ball drops onto the place in the last third of the flight, on the gravity curve.
      const start = t0 + f.duration * 0.62, len = 360;
      this._drop = () => {
        const t = (performance.now() - start) / len;
        if (t >= 1) { this._drop = null; return 0; }
        return t < 0 ? null : 26 * (1 - t * t);
      };
      this._ball = to;
    }
    const step = (now) => {
      const t = Math.min(1, (now - t0) / f.duration);
      this.view = f.at(t);
      if (leg) {
        const pos = leg(core.lead(t));
        this._ball = pos;
        this._trail = { from, to: pos, alpha: 1 };
      }
      this._draw();
      if (t < 1 || this._drop) { this._anim = requestAnimationFrame(step); return; }
      this._anim = 0;
      this._flight = null;
      this._ball = to ?? null;
      this._draw();
      if (this._trail) this._fadeTrail();
      else done?.();
    };
    this._anim = requestAnimationFrame(step);
  }

  // The closing beat: each leg of the route lights tomato in date order, the way the reader
  // travelled it, then the whole route fades back to chalk. About two and a half seconds.
  _traceRoute() {
    const { core } = this;
    const legs = this._route.coordinates.map(([a, b]) => ({ a, b, at: core.geoInterpolate(a, b) }));
    if (!legs.length) return;
    const STEP = 260, LEG = 520, FADE = 600;
    const total = STEP * (legs.length - 1) + LEG;
    const t0 = performance.now();
    const step = (now) => {
      const t = now - t0;
      const alpha = t < total ? 1 : 1 - (t - total) / FADE;
      if (alpha <= 0) { this._trace = null; this._anim = 0; this._draw(); return; }
      this._trace = {
        alpha,
        lines: legs.map((l, n) => {
          const p = Math.max(0, Math.min(1, (t - n * STEP) / LEG));
          return p > 0 ? [l.a, l.at(core.lead(p))] : null;
        }).filter(Boolean),
      };
      this._draw();
      this._anim = requestAnimationFrame(step);
    };
    this._anim = requestAnimationFrame(step);
  }

  _fadeTrail() {
    const t0 = performance.now();
    const step = (now) => {
      const t = (now - t0) / 480;
      if (!this._trail) return;
      if (t >= 1) { this._trail = null; this._anim = 0; this._draw(); return; }
      this._trail.alpha = 1 - t;
      this._draw();
      this._anim = requestAnimationFrame(step);
    };
    this._anim = requestAnimationFrame(step);
  }

  // Stop any flight where it is: the ball lands, the trail goes, and the camera stays.
  _halt() {
    cancelAnimationFrame(this._anim);
    this._anim = 0;
    if (this._flight) { this._ball = this._flight.to ?? this._ball; this._flight = null; }
    this._trail = null;
    this._trace = null;
    this._drop = null;
  }

  _zoomBy(scale, cx, cy) {
    const { core } = this;
    const k = Math.max(core.ZOOM.min, Math.min(core.ZOOM.max, this.view.k * scale));
    const keep = this._ball;
    this._fly(this._zoomed(k, cx, cy), keep);
  }

  // The view at zoom k that keeps the point under (cx, cy) in place, or the center.
  _zoomed(k, cx, cy) {
    const { core } = this;
    const v = this.view;
    if (cx === undefined) return { ...v, k };
    const r = this.map.getBoundingClientRect();
    const p = core.projection(this._w, this._h, v).invert([cx - r.left, cy - r.top]);
    if (!p || !p.every(Number.isFinite)) return { ...v, k };
    const [lon, lat] = core.geoInterpolate([v.lon, v.lat], p)(1 - v.k / k);
    return { lon, lat, k };
  }

  _showAll() {
    this._fly(this.core.overview(this._shown(), this._w, this._h), this._ball ?? undefined);
  }

  // ------------------------------------------------------------- input

  _turn(dx, dy) {
    const { core } = this;
    const v = this.view;
    const deg = core.toDegrees(1, this._w, this._h, v.k);
    this.view = { lon: ((v.lon - dx * deg + 540) % 360) - 180, lat: Math.max(-80, Math.min(80, v.lat + dy * deg)), k: v.k };
    this._paint();
  }

  _down(e) {
    if (!this._live || e.button > 0 || e.target.closest("button")) return;
    this._halt();
    this._ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    // A pointer the browser did not start, such as a synthetic one, cannot be captured.
    try { this.map.setPointerCapture(e.pointerId); } catch {}
    this.map.setAttribute("data-dragging", "");
  }

  _move(e) {
    const last = this._ptrs.get(e.pointerId);
    if (!last) return;
    const pts = [...this._ptrs.values()];
    if (pts.length === 1) {
      this._turn(e.clientX - last[0], e.clientY - last[1]);
    } else if (pts.length === 2) {
      // Pinch: zoom by the change in distance, about the midpoint; move with the midpoint.
      const other = pts.find((p) => p !== last);
      const d0 = Math.hypot(last[0] - other[0], last[1] - other[1]);
      const d1 = Math.hypot(e.clientX - other[0], e.clientY - other[1]);
      const { core } = this;
      if (d0 > 0) {
        const k = Math.max(core.ZOOM.min, Math.min(core.ZOOM.max, this.view.k * (d1 / d0)));
        this.view = this._zoomed(k, (e.clientX + other[0]) / 2, (e.clientY + other[1]) / 2);
      }
      this._turn((e.clientX - last[0]) / 2, (e.clientY - last[1]) / 2);
    }
    this._ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  }

  _up(e) {
    this._ptrs.delete(e.pointerId);
    if (!this._ptrs.size) this.map.removeAttribute("data-dragging");
  }

  // Plain scroll keeps scrolling the page; Ctrl or Cmd and scroll (and a trackpad pinch,
  // which arrives as one) zooms.
  _wheel(e) {
    if (!this._live) return;
    if (!(e.ctrlKey || e.metaKey)) {
      this._readout(`${mac() ? "Cmd" : "Ctrl"} and scroll to zoom`);
      clearTimeout(this._hintTimer);
      this._hintTimer = setTimeout(() => this._readout(), 1600);
      return;
    }
    e.preventDefault();
    this._halt();
    const { core } = this;
    const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    const k = Math.max(core.ZOOM.min, Math.min(core.ZOOM.max, this.view.k * Math.exp(-step * 0.0025)));
    this.view = this._zoomed(k, e.clientX, e.clientY);
    this._paint();
  }

  _key(e) {
    if (e.target !== this.map || !this._live) return;
    const step = Math.min(this._w, this._h) * 0.15;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) { e.preventDefault(); this._halt(); this._turn(-moves[e.key][0], -moves[e.key][1]); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); this._zoomBy(2); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); this._zoomBy(0.5); }
    else if (e.key === "0" || e.key === "Home") { e.preventDefault(); this._showAll(); }
  }
}

if (!customElements.get("ply-atlas")) customElements.define("ply-atlas", PlyAtlas);
export { PlyAtlas };
