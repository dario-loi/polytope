// On-this-page lists. A .ply-toc[data-auto] fills itself from the h2/h3 headings inside
// [data-toc-scope], giving headings ids where they lack one. Every .ply-toc then marks the
// section you are reading with aria-current="true".
const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function build(toc) {
  const scope = document.querySelector("[data-toc-scope]");
  const list = toc.querySelector("ul");
  if (!scope || !list) return;
  const heads = [...scope.querySelectorAll("h2, h3")].filter((h) => !h.closest("[data-toc-skip], .ex__live, .ply-app, .ply-abstract"));
  if (heads.length < 2) { toc.hidden = true; return; }
  const used = new Set();
  for (const h of heads) {
    if (!h.id) {
      let id = slug(h.textContent || "section") || "section";
      while (used.has(id) || document.getElementById(id)) id += "-x";
      h.id = id;
    }
    used.add(h.id);
    const li = document.createElement("li");
    if (h.tagName === "H3") li.className = "ply-toc__sub";
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    li.append(a);
    list.append(li);
  }
}

function track(toc) {
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const targets = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  if (!targets.length) return;
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    const first = targets.find((t) => visible.has(t));
    if (!first) return;
    for (const a of links) {
      if (a.hash.slice(1) === first.id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
  }, { rootMargin: "0px 0px -65% 0px" });
  targets.forEach((t) => io.observe(t));
}

for (const toc of document.querySelectorAll(".ply-toc")) {
  if (toc.hasAttribute("data-auto")) build(toc);
  track(toc);
}
