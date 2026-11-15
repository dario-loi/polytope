// Top bar: the chapter tabs show when they fit beside the wordmark and the tools, and the
// chapter menu takes their place when they do not. How many tabs fit depends on how many
// chapters a site has and how long their names are, which no breakpoint can know. Without
// this script a breakpoint decides (72rem), and tabs that do not fit scroll in their row.
//   <script type="module" src=".../js/topbar.js"></script>  (also part of js/all.js)

// Each way the bar can be drawn, roomiest first: the tabs, the tabs set closer, the tabs set
// closer with an icon for search, then the menu.
//
// An inline search field (astro/Search.astro variant="inline") sits in the tools, which never
// shrink, so the room left for the tabs already has the field's width taken out of it, and a
// field that grows on focus never changes the layout: it grows over the gap the tabs leave
// (measured here as --ply-search-room). Snug and tight set the field narrower. In the menu
// state the field is an icon button, and pressing it opens the field across the whole bar.
const STATES = ["tabs", "snug", "tight"];

// Under reduced motion every style change runs as a 0.01ms transition (reset.css), and a size
// read during one is the old size. Finishing them makes the measurement see the new state.
function settle(bar) {
  for (const a of bar.getAnimations?.({ subtree: true }) ?? []) if (a.transitionProperty) a.finish();
}

// The bar wraps to a second row only in the menu state (nav.css, below 30rem), so every state
// measured here is a single row and a wrapped bar never reads as a fit.
function fit(bar) {
  const links = bar.querySelector(".ply-topbar__links");
  const field = bar.querySelector(".ply-search__field");
  if (!links && !field) return;
  let state;
  if (links) {
    // Try each state and keep the first that fits. Nothing paints between the writes, so a bar
    // that ends on the menu never flashes its tabs.
    state = STATES.find((s) => {
      bar.dataset.plyTabs = s;
      settle(bar);
      return links.scrollWidth <= links.clientWidth + 1;
    }) ?? "menu";
  } else {
    // No chapters: only the search field can crowd the bar, and it folds to its icon.
    const inner = bar.querySelector(".ply-topbar__inner");
    bar.dataset.plyTabs = "tabs";
    settle(bar);
    state = inner && inner.scrollWidth > inner.clientWidth + 1 ? "menu" : "tabs";
  }
  bar.dataset.plyTabs = state;
  settle(bar);
  if (state !== "menu") {
    bar.querySelector(".ply-menu--chapters")?.removeAttribute("open");
    // The field is back in the bar, so a bar-wide search has nothing left to cover.
    for (const s of bar.querySelectorAll("ply-search[data-expanded]")) s.collapse?.();
  }
  room(bar);
}

// How far the focused field may grow to its start side: the gap between the last tab (or the
// wordmark) and the field, less a little air. Zero where the field is an icon.
function room(bar) {
  const field = bar.querySelector(".ply-search__field");
  if (!field || !field.getClientRects().length || bar.dataset.plyTabs === "menu") { bar.style.removeProperty("--ply-search-room"); return; }
  const tabs = [...bar.querySelectorAll(".ply-topbar__links .ply-tab")].filter((t) => t.getClientRects().length);
  const before = tabs.at(-1) ?? bar.querySelector(".ply-wordmark");
  const gap = field.getBoundingClientRect().left - (before?.getBoundingClientRect().right ?? 0) - 12;
  bar.style.setProperty("--ply-search-room", `${Math.max(0, Math.floor(gap))}px`);
}

// The chapter menu is a native details element. Escape closes it and puts focus back on its
// button; so does a press outside it, or focus moving on past it, so it never stays open over
// the page.
function closeMenu(menu, focus) {
  menu.removeAttribute("open");
  if (focus) menu.querySelector("summary")?.focus();
}

if (!window.__plyMenu) {
  window.__plyMenu = true;
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const menu = e.target.closest?.("details.ply-menu[open]");
    if (menu) { closeMenu(menu, true); e.preventDefault(); }
  });
  document.addEventListener("pointerdown", (e) => {
    for (const menu of document.querySelectorAll("details.ply-menu[open]")) if (!menu.contains(e.target)) closeMenu(menu, false);
  });
  document.addEventListener("focusout", (e) => {
    const menu = e.target.closest?.("details.ply-menu[open]");
    if (menu && e.relatedTarget instanceof Node && !menu.contains(e.relatedTarget)) closeMenu(menu, false);
  });
}

if (!window.__plyTopbar && "ResizeObserver" in window) {
  window.__plyTopbar = true;
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) fit(e.target.closest(".ply-topbar"));
  });
  const start = () => {
    for (const bar of document.querySelectorAll(".ply-topbar")) {
      const inner = bar.querySelector(".ply-topbar__inner");
      if (inner) ro.observe(inner);
    }
  };
  // The tabs and the wordmark change width when the fonts arrive, which no observer sees. Fonts
  // can start loading after this script runs, so each finished load measures again.
  const refit = () => document.querySelectorAll(".ply-topbar").forEach(fit);
  document.fonts?.ready.then(refit);
  document.fonts?.addEventListener("loadingdone", refit);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

export {};
