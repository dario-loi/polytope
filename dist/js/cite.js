// Citation cards (.ply-cite). CSS opens the card on hover and focus; this script lets
// Escape close it without moving the pointer or focus, and shifts an open card sideways
// so it stays inside the viewport near the page edges.
const EDGE = 8;

function place(cite) {
  const card = cite.querySelector(".ply-cite__card");
  if (!card) return;
  cite.style.removeProperty("--_dx");
  const r = card.getBoundingClientRect();
  if (!r.width) return;
  const vw = document.documentElement.clientWidth;
  const dx = r.left < EDGE ? EDGE - r.left : r.right > vw - EDGE ? vw - EDGE - r.right : 0;
  if (dx) cite.style.setProperty("--_dx", `${Math.round(dx)}px`);
}

function open(e) {
  const cite = e.target.closest?.(".ply-cite");
  if (!cite) return;
  delete cite.dataset.dismissed;
  requestAnimationFrame(() => place(cite));
}

document.addEventListener("pointerover", open);
document.addEventListener("focusin", open);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  for (const cite of document.querySelectorAll(".ply-cite:is(:hover, :focus-within)")) cite.dataset.dismissed = "";
});
