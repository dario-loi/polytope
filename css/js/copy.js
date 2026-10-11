// Copy buttons for code panels: <button class="ply-code__copy" data-ply-copy>Copy</button>
// inside a .ply-code. Copies the text of the panel's <pre>. The result is announced through
// one shared live region, since a changed button label is often not read out.
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

let region;
function announce(text) {
  if (!region) {
    region = document.createElement("div");
    region.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap";
    region.setAttribute("role", "status");
    document.body.append(region);
  }
  region.textContent = "";
  requestAnimationFrame(() => { region.textContent = text; });
}

// When the clipboard is blocked, select the code so the reader can copy it by hand.
function selectCode(pre) {
  const range = document.createRange();
  range.selectNodeContents(pre);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest?.("[data-ply-copy]");
  if (!btn) return;
  const pre = btn.closest(".ply-code")?.querySelector("pre");
  if (!pre) return;
  btn.dataset.label ??= btn.textContent;
  const ok = await copyText(pre.innerText.replace(/\n$/, ""));
  const key = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Cmd" : "Ctrl";
  if (!ok) selectCode(pre);
  btn.textContent = ok ? "Copied" : `Press ${key}+C`;
  announce(ok ? "Code copied" : `Code selected. Press ${key}+C to copy it.`);
  btn.toggleAttribute("data-copied", ok);
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.textContent = btn.dataset.label; btn.removeAttribute("data-copied"); }, 1600);
});
