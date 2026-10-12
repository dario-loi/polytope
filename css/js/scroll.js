// Scroll boxes: a wide table, a long equation, or a scroll cue scrolls sideways, and a
// keyboard can only scroll it when the box itself takes focus. While its content overflows,
// each box gets tabindex="0", role="region", and a name; when it fits again they come off,
// so a box that fits is never an empty tab stop. A box the author already made focusable, or
// named, keeps what the author gave it.
//   <script type="module" src=".../js/scroll.js"></script>  (also part of js/all.js)
// Boxes added later, by a script or a client-side route, are picked up too.

const BOXES = ".ply-table-wrap, .ply-equation__body, .ply-scroll-cue";
const OURS = "data-ply-scroll";

// A name a screen reader can say on entering the box: the table's caption, the equation's
// number, or the heading the box sits under.
function name(box) {
  const caption = box.querySelector("caption")?.textContent.trim();
  if (caption) return `${caption}, table`;
  if (box.matches(".ply-equation__body")) {
    const num = box.parentElement?.querySelector(".ply-equation__num")?.textContent.trim();
    return num ? `Equation ${num}` : "Equation";
  }
  let el = box;
  while (el && el !== document.body) {
    let prev = el.previousElementSibling;
    while (prev) {
      if (/^H[2-6]$/.test(prev.tagName)) return `${prev.textContent.trim()}, ${box.querySelector("table") ? "table" : "scrolling area"}`;
      prev = prev.previousElementSibling;
    }
    el = el.parentElement;
  }
  return box.querySelector("table") ? "Table" : "Scrolling area";
}

function update(box) {
  const overflows = box.scrollWidth > box.clientWidth + 1;
  const mine = box.hasAttribute(OURS);
  if (overflows && !mine && !box.hasAttribute("tabindex")) {
    box.setAttribute(OURS, "");
    box.tabIndex = 0;
    if (!box.hasAttribute("role")) { box.setAttribute("role", "region"); box.setAttribute(`${OURS}-role`, ""); }
    if (!box.hasAttribute("aria-label") && !box.hasAttribute("aria-labelledby")) { box.setAttribute("aria-label", name(box)); box.setAttribute(`${OURS}-label`, ""); }
  } else if (!overflows && mine) {
    // Keep it while it holds focus, so a reader never loses their place mid-resize.
    if (box === document.activeElement) return;
    box.removeAttribute(OURS);
    box.removeAttribute("tabindex");
    if (box.hasAttribute(`${OURS}-role`)) { box.removeAttribute("role"); box.removeAttribute(`${OURS}-role`); }
    if (box.hasAttribute(`${OURS}-label`)) { box.removeAttribute("aria-label"); box.removeAttribute(`${OURS}-label`); }
  }
}

if (!window.__plyScroll && "ResizeObserver" in window) {
  window.__plyScroll = true;
  const seen = new WeakSet();
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) update(e.target.matches(BOXES) ? e.target : e.target.parentElement);
  });
  const watch = (root) => {
    for (const box of root.querySelectorAll?.(BOXES) ?? []) {
      if (seen.has(box)) continue;
      seen.add(box);
      ro.observe(box);
      // The content can grow while the box keeps its size.
      if (box.firstElementChild) ro.observe(box.firstElementChild);
    }
  };
  const start = () => {
    watch(document);
    new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) { if (n.matches(BOXES)) watch(n.parentElement); else watch(n); }
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

export {};
