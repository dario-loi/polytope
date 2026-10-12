// Top bar: the chapter tabs show when they fit beside the wordmark and the tools, and the
// chapter menu takes their place when they do not. How many tabs fit depends on how many
// chapters a site has and how long their names are, which no breakpoint can know. Without
// this script a breakpoint decides (72rem), and tabs that do not fit scroll in their row.
//   <script type="module" src=".../js/topbar.js"></script>  (also part of js/all.js)

// Each way the bar can be drawn, roomiest first: the tabs, the tabs set closer, the tabs set
// closer with an icon for search, then the menu.
const STATES = ["tabs", "snug", "tight"];

// Under reduced motion every style change runs as a 0.01ms transition (reset.css), and a size
// read during one is the old size. Finishing them makes the measurement see the new state.
function settle(bar) {
  for (const a of bar.getAnimations?.({ subtree: true }) ?? []) if (a.transitionProperty) a.finish();
}

function fit(bar) {
  const links = bar.querySelector(".ply-topbar__links");
  if (!links) return;
  // Try each state and keep the first that fits. Nothing paints between the writes, so a bar
  // that ends on the menu never flashes its tabs.
  const state = STATES.find((s) => {
    bar.dataset.plyTabs = s;
    settle(bar);
    return links.scrollWidth <= links.clientWidth + 1;
  }) ?? "menu";
  bar.dataset.plyTabs = state;
  settle(bar);
  if (state !== "menu") bar.querySelector(".ply-menu--chapters")?.removeAttribute("open");
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
