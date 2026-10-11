// Small behaviours for form controls in plain HTML.
// - Range sliders inside [data-ply-slider] print their value in the sibling <output>.
//   data-format on the wrapper: "int" (default), "fixed2", or "percent".
// - Buttons in a .ply-segmented group act as a single choice (aria-pressed) and fire
//   a "ply-change" event on the group with detail { value }.
const fmt = (v, f) => (f === "percent" ? `${Math.round(v * 100)}%` : f === "fixed2" ? v.toFixed(2) : String(Math.round(v)));

document.addEventListener("input", (e) => {
  const input = e.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "range") return;
  const wrap = input.closest("[data-ply-slider]");
  const out = wrap?.querySelector("output");
  if (out) out.textContent = fmt(Number(input.value), wrap.dataset.format);
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest?.(".ply-segmented button");
  if (!btn) return;
  const group = btn.closest(".ply-segmented");
  for (const b of group.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b === btn));
  group.dispatchEvent(new CustomEvent("ply-change", { bubbles: true, detail: { value: btn.value || btn.textContent.trim() } }));
});
