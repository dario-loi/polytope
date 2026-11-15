// <ply-search>: site search over the site's own Pagefind index. astro/Search.astro prints:
//   <ply-search bundle="/pagefind/" base-url="/">
//     <a class="ply-search-trigger" href="/a-page-for-no-script/" data-ply-search-open>...</a>
//     <dialog class="ply-search__dialog"> input.ply-search__input, .ply-search__status,
//       .ply-search__idle, ul.ply-search__results, button.ply-search__more </dialog>
//   </ply-search>
// Build the index after the site build, for example: npx pagefind --site dist
// "/" or Ctrl/Cmd+K opens it, arrows move through results, Enter follows one, Esc closes.
// A page names its kind with data-pagefind-meta="kind:Publications"; the panel shows it.
// ranking='{"pageLength":0.2}' passes Pagefind ranking options through. A record with
// meta.summary shows that text instead of an excerpt.

const PAGE = 8;
const SECTIONS = 3;
// A query counts as settled when the reader has not typed for this long.
const SETTLE = 800;
const SVG = "http://www.w3.org/2000/svg";

function el(tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

// Pagefind excerpts wrap matches in <mark>. Keep the marks and treat everything else as text.
const decoder = document.createElement("textarea");
function excerptNodes(html) {
  const frag = document.createDocumentFragment();
  let mark = null;
  for (const part of String(html ?? "").split(/(<\/?mark>)/)) {
    if (part === "<mark>") { mark = el("mark"); frag.append(mark); continue; }
    if (part === "</mark>") { mark = null; continue; }
    if (!part) continue;
    decoder.innerHTML = part;
    (mark || frag).append(decoder.value);
  }
  return frag;
}

// One line of an excerpt for the drop panel: a window of about `max` characters around the
// first match, so the mark is in view, with an ellipsis where text was cut.
function excerptLine(html, max = 64) {
  const parts = [];
  let mark = false;
  for (const part of String(html ?? "").split(/(<\/?mark>)/)) {
    if (part === "<mark>") { mark = true; continue; }
    if (part === "</mark>") { mark = false; continue; }
    if (!part) continue;
    decoder.innerHTML = part;
    parts.push({ text: decoder.value, mark });
  }
  const text = parts.map((p) => p.text).join("");
  let at = 0;
  const first = parts.findIndex((p) => p.mark);
  if (first > 0) at = parts.slice(0, first).reduce((n, p) => n + p.text.length, 0);
  let start = Math.max(0, at - 16);
  if (start > 0) { const sp = text.indexOf(" ", start); if (sp > 0 && sp < at) start = sp + 1; }
  let end = Math.min(text.length, start + max);
  // A window that ends inside a match takes the whole match, so no mark is left in pieces.
  for (let pos = 0, i = 0; i < parts.length; pos += parts[i].text.length, i++) {
    if (parts[i].mark && pos < end && pos + parts[i].text.length > end) end = pos + parts[i].text.length;
  }
  const frag = document.createDocumentFragment();
  if (start > 0) frag.append("... ");
  let pos = 0;
  for (const p of parts) {
    const a = Math.max(pos, start), b = Math.min(pos + p.text.length, end);
    if (b > a) {
      const t = p.text.slice(a - pos, b - pos);
      if (p.mark) { const m = el("mark"); m.textContent = t; frag.append(m); } else frag.append(t);
    }
    pos += p.text.length;
  }
  if (end < text.length) frag.append(" ...");
  return frag;
}

function arrow() {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "ply-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "1.125em");
  svg.setAttribute("height", "1.125em");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.25");
  svg.setAttribute("stroke-linecap", "square");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", "M4 12h15M13 6l6 6-6 6");
  svg.append(path);
  return svg;
}

class PlySearch extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.inline = this.getAttribute("variant") === "inline";
    this.trigger = this.querySelector("[data-ply-search-open]");
    this.dialog = this.querySelector(".ply-search__dialog");
    this.input = this.querySelector(".ply-search__input");
    this.status = this.querySelector(".ply-search__status");
    this.idle = this.querySelector(".ply-search__idle");
    this.list = this.querySelector(".ply-search__results");
    this.more = this.querySelector(".ply-search__more");
    this.field = this.querySelector(".ply-search__field");
    this.panel = this.querySelector(".ply-search__panel");
    this.live = this.querySelector("[data-ply-live]");
    this.hint = this.querySelector("[data-ply-hint]");
    this.empty = this.querySelector("[data-ply-empty]");
    if (!this.trigger || !this.input || !this.list || !(this.inline ? this.field && this.panel : this.dialog)) return;
    this._uid = this.id || "ply-search";
    this._n = 0;
    // It is a link to a fallback page without script; with script it opens the search, so it
    // is announced as a button and answers Space as one.
    this.trigger.setAttribute("role", "button");
    this.trigger.setAttribute("aria-haspopup", this.inline ? "true" : "dialog");
    this.trigger.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); this.open(); } });
    this.trigger.addEventListener("click", (e) => { e.preventDefault(); this.open(); });
    this.input.addEventListener("input", () => { this._query(); if (this.inline) this._openPanel(); });
    this.input.addEventListener("keydown", (e) => this._key(e));
    this.list.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button)) { e.preventDefault(); this._go(a.href, a.closest('[role="option"]')); }
    });
    this.more?.addEventListener("click", () => { this._render(); this.input.focus(); });
    if (this.inline) {
      this.trigger.setAttribute("aria-expanded", "false");
      // The index loads on the first focus, not before: most pages never search.
      this.input.addEventListener("focus", () => { this._load(); this._openPanel(); });
      this.field.addEventListener("focusout", (e) => {
        if (e.relatedTarget instanceof Node && this.field.contains(e.relatedTarget)) return;
        // Focus leaving with the window (switching tabs) keeps the panel as it was.
        if (!document.hasFocus()) return;
        this._closePanel();
        // A bar folded to its icon goes back to it when focus moves on.
        if (this.hasAttribute("data-expanded") && e.relatedTarget) this.collapse();
      });
      // A press on the panel's own padding or scrollbar keeps focus in the field.
      this.panel.addEventListener("mousedown", (e) => { if (!e.target.closest("a")) e.preventDefault(); });
      document.addEventListener("pointerdown", (e) => {
        if (this.field.contains(e.target)) return;
        if (this._open) this._closePanel();
        this.collapse();
      });
      this.querySelector(".ply-search__dismiss")?.addEventListener("click", () => this.collapse(true));
    } else {
      // Start fetching the index as soon as the reader shows intent.
      for (const ev of ["pointerenter", "focus"]) this.trigger.addEventListener(ev, () => this._load(), { once: true });
      this.dialog.addEventListener("click", (e) => { if (e.target === this.dialog) this.close(); });
      this.querySelector(".ply-search__close")?.addEventListener("click", () => this.close());
      this.dialog.addEventListener("close", () => this._select(-1));
    }
  }

  open() {
    if (this.inline) {
      if (!this.field.getClientRects().length) this.expand();
      this.input.focus();
      this.input.select();
      return;
    }
    if (!this.dialog.open) { this.dialog.showModal(); this._emit("open"); }
    this.input.focus();
    this.input.select();
    this._load();
  }

  close() {
    if (this.inline) { this._closePanel(); this.input.blur(); return; }
    if (this.dialog.open) this.dialog.close();
  }

  // Inline only. Where the bar has folded its tabs the field is an icon button; expanding it
  // lays the field across the whole bar, and everything it covers is made inert so Tab cannot
  // reach what is hidden.
  expand() {
    if (!this.inline || this.hasAttribute("data-expanded")) return;
    this.setAttribute("data-expanded", "");
    this.trigger.setAttribute("aria-expanded", "true");
    this._inert = [];
    const inner = this.closest(".ply-topbar__inner");
    for (let node = this; inner && node && node !== inner; node = node.parentElement) {
      for (const sib of node.parentElement.children) {
        if (sib !== node && !sib.hasAttribute("inert")) { sib.setAttribute("inert", ""); this._inert.push(sib); }
      }
    }
  }

  collapse(focus = false) {
    if (!this.inline || !this.hasAttribute("data-expanded")) return;
    this.removeAttribute("data-expanded");
    this.trigger.setAttribute("aria-expanded", "false");
    for (const n of this._inert ?? []) n.removeAttribute("inert");
    this._inert = [];
    this._closePanel();
    if (focus) this.trigger.focus();
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(`ply-search:${name}`, { bubbles: true, detail }));
  }

  _openPanel() {
    if (!this._open) { this._open = true; this._emit("open"); }
    this._sync();
  }

  _closePanel() {
    this._open = false;
    this._sync();
  }

  // Inline: the panel shows while the field has focus and there is something to show.
  _sync() {
    if (!this.inline) return;
    const options = this.list.childElementCount > 0;
    const content = options || this.status.childNodes.length > 0 || Boolean(this.idle && !this.idle.hidden);
    const show = Boolean(this._open) && content;
    this.panel.hidden = !show;
    this.input.setAttribute("aria-expanded", String(show && options));
  }

  _load() {
    if (!this._pf) {
      const bundle = (this.getAttribute("bundle") || "/pagefind/").replace(/\/?$/, "/");
      this._status("loading");
      this._pf = import(/* @vite-ignore */ `${bundle}pagefind.js`)
        .then(async (pf) => {
          let ranking;
          try { ranking = JSON.parse(this.getAttribute("ranking") || "null") ?? undefined; } catch { ranking = undefined; }
          await pf.options({ baseUrl: this.getAttribute("base-url") || "/", ...(ranking ? { ranking } : {}) });
          await pf.init?.();
          if (!this.input.value.trim()) this._status("");
          return pf;
        })
        .catch((err) => {
          console.warn(`[polytope] search: no Pagefind index at ${bundle}. Build one after the site build, for example: npx pagefind --site dist`, err);
          this._status("missing");
          return null;
        });
    }
    return this._pf;
  }

  async _query() {
    const q = this.input.value.trim();
    this._select(-1);
    clearTimeout(this._settle);
    if (!q) { this._results = null; this.list.replaceChildren(); this._show(false); this._status(""); return; }
    const pf = await this._load();
    if (!pf) return;
    const search = await pf.debouncedSearch(q, {}, 150);
    // null means a newer query replaced this one before it ran.
    if (search === null || q !== this.input.value.trim()) return;
    this._q = q;
    this._results = await this._rank(search.results, q);
    if (q !== this.input.value.trim()) return;
    this._shown = 0;
    this.list.replaceChildren();
    await this._render();
  }

  async _render() {
    const results = this._results;
    if (!results) return;
    if (this.inline) return this._renderDrop(results);
    const q = this._q;
    const batch = results.slice(this._shown, this._shown + PAGE);
    const data = await Promise.all(batch.map((r) => r._data ?? r.data()));
    if (results !== this._results) return;
    for (const d of data) this.list.append(...this._hits(d));
    this._shown += batch.length;
    if (this.more) this.more.hidden = this._shown >= results.length;
    this._show(results.length > 0);
    const n = results.length;
    this.status.textContent = n
      ? `${n} ${n === 1 ? "result" : "results"} for "${q}"`
      : `Nothing matches "${q}". Try a shorter or broader word, or open a chapter.`;
    this._report(n);
  }

  // The drop panel: up to eight pages, grouped by kind in the order each kind first appears,
  // so the best match stays first, then a link to the full list.
  async _renderDrop(results) {
    const q = this._q;
    const batch = results.slice(0, PAGE);
    const data = await Promise.all(batch.map((r) => r._data ?? r.data()));
    if (results !== this._results) return;
    const groups = new Map();
    for (const d of data) {
      const kind = d.meta?.kind || "";
      if (!groups.has(kind)) groups.set(kind, []);
      groups.get(kind).push(d);
    }
    this.list.replaceChildren();
    this._n = 0;
    for (const [kind, pages] of groups) {
      const group = el("li", "ply-search__group");
      group.setAttribute("role", "presentation");
      const ul = el("ul");
      ul.setAttribute("role", kind ? "group" : "presentation");
      if (kind) {
        const name = el("span", "ply-label");
        name.textContent = kind;
        name.setAttribute("aria-hidden", "true");
        ul.setAttribute("aria-label", kind);
        group.append(name);
      }
      for (const d of pages) ul.append(this._hit("page", d.url, d.meta?.title || d.url, d.meta?.summary ? null : d.excerpt, kind, d.meta?.swatch, d.meta?.summary));
      group.append(ul);
      this.list.append(group);
    }
    const all = this.getAttribute("results-href");
    if (all && results.length) {
      const url = `${all}${all.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}`;
      const li = this._hit("all", url, "All results");
      li.querySelector("a").append(arrow());
      li.dataset.kind = "all";
      li.dataset.url = all;
      li.setAttribute("aria-label", `All ${results.length} results`);
      this.list.append(li);
    }
    this._status("");
    this._show(results.length > 0);
    const n = results.length;
    const shown = q.length > 40 ? `${q.slice(0, 39)}...` : q;
    this._announce(n ? `${n} ${n === 1 ? "result" : "results"} for ${shown}` : `No results for ${shown}`);
    this._report(n);
  }

  // A page whose title or a section heading names every word of the query comes first, ahead
  // of short records (with meta.summary) that only carry the word: someone searching
  // "mustard" wants the page on color before the seven mustard tokens. Only the first results
  // are fetched to decide, and the rest keep Pagefind's order.
  async _rank(results, q) {
    const head = results.slice(0, 2 * PAGE);
    const data = await Promise.all(head.map((r) => r.data()));
    head.forEach((r, i) => { r._data = data[i]; });
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const names = (text) => {
      const ws = String(text || "").toLowerCase().split(/[^a-z0-9]+/);
      return words.every((w) => ws.some((x) => x.startsWith(w)));
    };
    const first = head.filter((r) => !r._data.meta?.summary && [r._data.meta?.title, ...(r._data.sub_results || []).map((s) => s.title)].some(names));
    return [...first, ...head.filter((r) => !first.includes(r)), ...results.slice(head.length)];
  }

  _hits(d) {
    const title = d.meta?.title || d.url;
    // meta.summary, when a record sets one, replaces the excerpt: a short fixed description.
    const page = this._hit("page", d.url, title, d.meta?.summary ? null : d.excerpt, d.meta?.kind, d.meta?.swatch, d.meta?.summary);
    page.setAttribute("aria-label", d.meta?.kind ? `${title}, ${d.meta.kind}` : title);
    const subs = (d.sub_results || [])
      .filter((s) => s.url !== d.url && s.url.includes("#") && s.title && s.title !== title)
      .slice(0, SECTIONS)
      .map((s) => {
        const li = this._hit("section", s.url, s.title, s.excerpt);
        li.setAttribute("aria-label", `${s.title}, in ${title}`);
        return li;
      });
    return [page, ...subs];
  }

  _hit(type, url, title, excerpt, kind, swatch, summary) {
    const li = el("li", `ply-search__hit ply-search__hit--${type}`);
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");
    li.id = `${this._uid}-o${this._n++}`;
    li.dataset.kind = kind || "";
    const a = el("a");
    a.href = url;
    a.tabIndex = -1;
    const t = el("span", "ply-search__title");
    if (swatch && /^#[0-9a-f]{3,8}$/i.test(swatch)) {
      const sw = el("span", "ply-swatch");
      sw.style.background = swatch;
      t.append(sw);
    }
    // In the drop panel a long title is one line, cut with an ellipsis.
    if (this.inline) { const s = el("span", "ply-search__name"); s.textContent = title; t.append(s); } else t.append(title);
    a.append(t);
    // The drop panel names the kind once, over its group.
    if (kind && !this.inline) { const k = el("span", "ply-label"); k.textContent = kind; a.append(k); }
    if (excerpt || summary) {
      const ex = el("span", "ply-search__excerpt");
      if (excerpt) ex.append(this.inline ? excerptLine(excerpt) : excerptNodes(excerpt));
      else ex.textContent = summary;
      a.append(ex);
    }
    li.append(a);
    return li;
  }

  _key(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (this.inline) this._openPanel();
      this._move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter") {
      const opts = this._options();
      const pick = opts[this._active] || opts[0];
      if (pick && !(this.inline && this.panel.hidden)) { e.preventDefault(); this._go(pick.querySelector("a").href, pick); }
    } else if (e.key === "Escape") {
      if (this.inline) {
        // Close the panel and drop focus; a bar folded to its icon is put back.
        e.preventDefault();
        if (this.hasAttribute("data-expanded")) this.collapse(true);
        else this.close();
        return;
      }
      // Close instead of clearing, so reopening shows the last results.
      e.preventDefault();
      this.close();
    }
  }

  _options() { return [...this.list.querySelectorAll('[role="option"]')]; }

  _move(step) {
    const opts = this._options();
    if (!opts.length) return;
    const i = this._active ?? -1;
    this._select(i < 0 ? (step > 0 ? 0 : opts.length - 1) : (i + step + opts.length) % opts.length);
  }

  _select(i) {
    const opts = this._options();
    opts.forEach((o, k) => o.setAttribute("aria-selected", String(k === i)));
    this._active = i;
    if (i >= 0 && opts[i]) {
      this.input.setAttribute("aria-activedescendant", opts[i].id);
      opts[i].scrollIntoView({ block: "nearest" });
    } else this.input.removeAttribute("aria-activedescendant");
  }

  _show(results) {
    const typed = Boolean(this.input.value.trim());
    if (this.inline) {
      // Nothing typed: the hint and the links. Nothing found: the links again, under the
      // empty-state line, so there is always a way on.
      if (this.hint) this.hint.hidden = typed;
      if (this.empty) this.empty.hidden = !(typed && !results);
      if (this.idle) this.idle.hidden = typed && results;
      this._sync();
      return;
    }
    this.input.setAttribute("aria-expanded", String(results));
    // With nothing found, the chapter shortcuts come back, so there is always a way on.
    if (this.idle) this.idle.hidden = typed && results;
    if (!results && this.more) this.more.hidden = true;
  }

  _announce(text) {
    if (this.inline && this.live) this.live.textContent = text;
    else if (this.status) this.status.textContent = text;
  }

  _status(state) {
    if (!this.status) return;
    if (state === "loading") {
      const ball = el("span", "ply-loading");
      ball.setAttribute("aria-hidden", "true");
      ball.append(el("i"));
      this.status.replaceChildren(ball, "Loading search");
    } else if (state === "missing") {
      if (this.inline) {
        // The index is not there: say so, and offer the page the no-script link goes to.
        const href = this.trigger.getAttribute("href");
        this.status.replaceChildren("Search is not available right now.");
        if (href && href !== "#") {
          const a = el("a");
          a.href = href;
          a.textContent = "Open the search page";
          this.status.append(" ", a);
        }
      } else this.status.textContent = "Search is not built for this site yet.";
      if (this.idle) this.idle.hidden = true;
    } else this.status.textContent = state;
    this._sync();
  }

  // Tell the page a query has settled: how many results, never what was asked. The bucket is
  // sent once the reader pauses, so typing "tok", "toke", "token" is one report.
  _report(n) {
    clearTimeout(this._settle);
    this._pending = n;
    this._settle = setTimeout(() => this._flush(), SETTLE);
  }

  _flush() {
    clearTimeout(this._settle);
    if (this._pending == null) return;
    const n = this._pending;
    this._pending = null;
    this._emit("results", { bucket: n === 0 ? "0" : n <= 5 ? "1-5" : "6+" });
  }

  _go(url, option) {
    this._flush();
    const u = new URL(url, location.href);
    // The path and hash only: the results page's own ?q= would be the query.
    const path = option?.dataset.url ? new URL(option.dataset.url, location.href) : u;
    this._emit("select", { url: path.pathname + path.hash, kind: option?.dataset.kind ?? "" });
    if (this.inline) this._closePanel(); else this.close();
    location.assign(u.href);
  }
}

if (!customElements.get("ply-search")) customElements.define("ply-search", PlySearch);

// One set of shortcuts for the page: the first search on it answers them.
if (!window.__plySearchKeys) {
  window.__plySearchKeys = true;
  document.addEventListener("keydown", (e) => {
    const s = document.querySelector("ply-search");
    if (!s || e.defaultPrevented || e.altKey) return;
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); s.open(); }
    else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); s.open(); }
  });
}

export { PlySearch };
