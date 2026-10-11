// Light/dark toggle. Any element with [data-ply-theme-toggle] flips the theme and remembers it.
// Put this inline in <head> before the stylesheet to avoid a flash on load:
// <script>try{var t=localStorage.getItem("ply-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
const KEY = "ply-theme";
const root = document.documentElement;

function current() {
  return root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function sync() {
  const dark = current() === "dark";
  // A toggle button with a fixed name ("Dark theme"); aria-pressed carries the state.
  for (const btn of document.querySelectorAll("[data-ply-theme-toggle]")) btn.setAttribute("aria-pressed", String(dark));
}

document.addEventListener("click", (e) => {
  if (!e.target.closest?.("[data-ply-theme-toggle]")) return;
  const next = current() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem(KEY, next); } catch {}
  sync();
});

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", sync);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync);
else sync();
