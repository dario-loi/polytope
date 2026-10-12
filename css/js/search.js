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

class PlySearch extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.trigger = this.querySelector("[data-ply-search-open]");
    this.dialog = this.querySelector(".ply-search__dialog");
    this.input = this.querySelector(".ply-search__input");
    this.status = this.querySelector(".ply-search__status");
    this.idle = this.querySelector(".ply-search__idle");
    this.list = this.querySelector(".ply-search__results");
    this.more = this.querySelector(".ply-search__more");
    if (!this.trigger || !this.dialog || !this.input || !this.list) return;
    this._uid = this.id || "ply-search";
    this._n = 0;
    // It is a link to a fallback page without script; with script it opens the panel, so it
    // is announced as a button and answers Space as one.
    this.trigger.setAttribute("role", "button");
    this.trigger.setAttribute("aria-haspopup", "dialog");
    this.trigger.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); this.open(); } });
    this.trigger.addEventListener("click", (e) => { e.preventDefault(); this.open(); });
    // Start fetching the index as soon as the reader shows intent.
    for (const ev of ["pointerenter", "focus"]) this.trigger.addEventListener(ev, () => this._load(), { once: true });
    this.input.addEventListener("input", () => this._query());
    this.input.addEventListener("keydown", (e) => this._key(e));
    this.dialog.addEventListener("click", (e) => { if (e.target === this.dialog) this.close(); });
    this.list.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button)) { e.preventDefault(); this._go(a.href); }
    });
    this.more?.addEventListener("click", () => { this._render(); this.input.focus(); });
    this.querySelector(".ply-search__close")?.addEventListener("click", () => this.close());
    this.dialog.addEventListener("close", () => this._select(-1));
  }

  open() {
    if (!this.dialog.open) this.dialog.showModal();
    this.input.focus();
    this.input.select();
    this._load();
  }

  close() {
    if (this.dialog.open) this.dialog.close();
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
    const a = el("a");
    a.href = url;
    a.tabIndex = -1;
    const t = el("span", "ply-search__title");
    if (swatch && /^#[0-9a-f]{3,8}$/i.test(swatch)) {
      const sw = el("span", "ply-swatch");
      sw.style.background = swatch;
      t.append(sw);
    }
    t.append(title);
    a.append(t);
    if (kind) { const k = el("span", "ply-label"); k.textContent = kind; a.append(k); }
    if (excerpt || summary) {
      const ex = el("span", "ply-search__excerpt");
      if (excerpt) ex.append(excerptNodes(excerpt));
      else ex.textContent = summary;
      a.append(ex);
    }
    li.append(a);
    return li;
  }

  _key(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      this._move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter") {
      const opts = this._options();
      const pick = opts[this._active] || opts[0];
      if (pick) { e.preventDefault(); this._go(pick.querySelector("a").href); }
    } else if (e.key === "Escape") {
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
    this.input.setAttribute("aria-expanded", String(results));
    // With nothing found, the chapter shortcuts come back, so there is always a way on.
    if (this.idle) this.idle.hidden = Boolean(this.input.value.trim()) && results;
    if (!results && this.more) this.more.hidden = true;
  }

  _status(state) {
    if (!this.status) return;
    if (state === "loading") {
      const ball = el("span", "ply-loading");
      ball.setAttribute("aria-hidden", "true");
      ball.append(el("i"));
      this.status.replaceChildren(ball, "Loading search");
    } else if (state === "missing") {
      this.status.textContent = "Search is not built for this site yet.";
      if (this.idle) this.idle.hidden = true;
    } else this.status.textContent = state;
  }

  _go(url) {
    this.close();
    location.assign(url);
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
