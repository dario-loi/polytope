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

// Name each button for the section it sits in, so the buttons on a page read as a list of
// sections ("Copy the HTML for Text fields"). Where no heading is found, the button keeps
// the name the server gave it, which quotes the code's first line.
function section(el) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    for (let prev = node.previousElementSibling; prev; prev = prev.previousElementSibling) {
      if (/^H[2-4]$/.test(prev.tagName)) return prev.textContent.trim();
    }
  }
  return "";
}
const named = new Map();
for (const btn of document.querySelectorAll("[data-ply-copy]")) {
  const code = btn.closest(".ply-code");
  const where = code && section(code.closest(".ex") ?? code);
  if (!where) continue;
  const raw = code.querySelector(".ply-code__lang")?.textContent.trim() || "code";
  const lang = { html: "HTML", astro: "Astro", css: "CSS", js: "JavaScript", ts: "TypeScript", sh: "shell", bash: "shell", py: "Python", python: "Python", json: "JSON", tex: "TeX", latex: "LaTeX" }[raw.toLowerCase()] ?? raw;
  const base = `Copy the ${lang} for ${where}`;
  const n = (named.get(base) ?? 0) + 1;
  named.set(base, n);
  btn.setAttribute("aria-label", n > 1 ? `${base}, part ${n}` : base);
}
