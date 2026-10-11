// Copy buttons for code panels: <button class="ply-code__copy" data-ply-copy>Copy</button>
// inside a .ply-code. Copies the text of the panel's <pre>.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest?.("[data-ply-copy]");
  if (!btn) return;
  const pre = btn.closest(".ply-code")?.querySelector("pre");
  if (!pre) return;
  const label = btn.textContent;
  const ok = await copyText(pre.innerText.replace(/\n$/, ""));
  btn.textContent = ok ? "Copied" : "Press Ctrl+C";
  if (ok) btn.setAttribute("data-copied", "");
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.textContent = label; btn.removeAttribute("data-copied"); }, 1600);
});
