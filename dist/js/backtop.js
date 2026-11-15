// Back to top, on phones: the floating button (astro/BackToTop.astro) shows only on scrolling up
// from more than a screen down, so it never sits under a reader's thumb during a downward read,
// and it goes again on scrolling down, after 2.5 s, and once the end of the page's content is
// within a screen (it would cover the last line and the footer's own link). A link with
// data-ply-backtop does the same without the button; without script it is an ordinary link to
// #top. Focus moves to <main> on the way up, so the next Tab starts at the page's top. One scrollY
// read per frame, in a passive listener.
//   <script type="module" src=".../js/backtop.js"></script>  (also part of js/all.js)
const btn = document.querySelector("[data-ply-backtop-button]");
const main = document.getElementById("main");
// Phones in portrait, and phones turned sideways (touch, under 32rem tall); the same query as the CSS.
const phone = matchMedia("(max-width: 47.99rem), (pointer: coarse) and (max-height: 32rem)");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

// Where the page's last content ends: the bottom of the deepest last element in main, so the
// padding after it does not count.
const end = () => {
  let el = main;
  while (el && el.lastElementChild) el = el.lastElementChild;
  return el ? el.getBoundingClientRect().bottom : 0;
};

let shown = false;
let timer = 0;
const show = (on) => {
  if (!btn || on === shown) return;
  shown = on;
  btn.classList.toggle("ply-backtop--on", on);
  btn.inert = !on;
  btn.tabIndex = on ? 0 : -1;
};

const toTop = (e) => {
  e?.preventDefault();
  scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
  if (main) {
    main.tabIndex = -1;
    main.focus({ preventScroll: true });
  }
  show(false);
};

for (const a of document.querySelectorAll("a[data-ply-backtop]")) a.addEventListener("click", toTop);

if (btn) {
  btn.addEventListener("click", toTop);
  let last = scrollY;
  let queued = false;
  const tick = () => {
    queued = false;
    const y = scrollY, dy = y - last;
    // Off on large screens, in the first screen, and once the end of the page's content is on
    // screen.
    if (!phone.matches || y < innerHeight || end() < innerHeight + 24) show(false);
    else if (dy < -8) show(true);
    else if (dy > 2) show(false);
    if (Math.abs(dy) > 2) last = y;
    clearTimeout(timer);
    if (shown) timer = window.setTimeout(() => show(false), 2500);
  };
  addEventListener("scroll", () => {
    if (!queued) { queued = true; requestAnimationFrame(tick); }
  }, { passive: true });
}
