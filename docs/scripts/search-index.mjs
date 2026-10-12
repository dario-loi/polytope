// Builds the docs search index after `astro build`: the pages in dist, plus every token,
// every .ply class, and every Astro component as a result of its own, each linking to the
// page that documents it. The kit's Search component reads the files this writes.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";

const docs = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(docs, "..");
const dist = join(docs, "dist");
const fail = (msg, errors) => { console.error(`search index: ${msg}`, errors); process.exit(1); };

// Page labels from the nav data, so a class can say which page documents it.
const navSource = readFileSync(join(docs, "src/data/nav.ts"), "utf8");
const labels = Object.fromEntries([...navSource.matchAll(/\{ label: "([^"]+)", path: "([^"]+)" \}/g)].map((m) => [m[2], m[1]]));

// Docs pages by URL, with their source, to find where a component is shown.
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : d.name.endsWith(".astro") ? [join(dir, d.name)] : []));
}
const pagesDir = join(docs, "src/pages");
const pages = walk(pagesDir).map((file) => {
  const rel = relative(pagesDir, file).replace(/\\/g, "/").replace(/(^|\/)index\.astro$/, "$1").replace(/\.astro$/, "/");
  return { url: `/${rel}`.replace(/\/+$/, "/"), source: readFileSync(file, "utf8") };
});

// Section headings get their ids here, in the built HTML, with the slug rule css/js/toc.js
// uses at runtime, so the ids match the on-this-page links. Pagefind finds a page's sections
// by their ids; without them a result could only point at the top of its page.
const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const unescape = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? (d.name === "pagefind" || d.name === "_astro" || d.name === "kit" ? [] : htmlFiles(join(dir, d.name))) : d.name.endsWith(".html") ? [join(dir, d.name)] : []));
}
let named = 0;
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, "utf8");
  const used = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const out = html.replace(/<(h[23])((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g, (all, tag, attrs, inner) => {
    if (/\sid=/.test(attrs)) return all;
    let id = slug(unescape(inner.replace(/<[^>]+>/g, ""))) || "section";
    while (used.has(id)) id += "-x";
    used.add(id);
    named++;
    return `<${tag} id="${id}"${attrs}>${inner}</${tag}>`;
  });
  if (out !== html) writeFileSync(file, out);
}

// Code samples and live examples would fill page excerpts with markup and button labels;
// classes and components are found through records of their own below.
// Swatch grids are token names and hex values, which the token records already carry.
const { index } = await pagefind.createIndex({ forceLanguage: "en", excludeSelectors: [".ply-code", ".ex__live", ".sw"] });
const added = await index.addDirectory({ path: dist });
if (added.errors.length) fail("could not index the built pages", added.errors);

let records = 0;
// Pagefind keys results by URL, so a record that shared a page's URL would replace that page.
// Classes and components link to their page with a text fragment instead: the browser lands
// on the first mention and highlights it. A dash is syntax in a text fragment, so it is escaped.
const fragment = (text) => `#:~:text=${encodeURIComponent(text).replace(/-/g, "%2D")}`;
async function add(record) {
  const { errors } = await index.addCustomRecord({ language: "en", ...record });
  if (errors.length) fail(`could not add ${record.meta.title}`, errors);
  records++;
}

// Tokens: found by name, value, and purpose; the link opens the Tokens page filtered to it.
const tokens = JSON.parse(readFileSync(join(root, "dist/tokens.json"), "utf8")).tokens;
for (const [name, t] of Object.entries(tokens)) {
  const isColor = typeof t.value === "string" && /^#[0-9a-f]{6}$/i.test(t.value);
  const purpose = (t.description ?? "").replace(/`([^`]+)`/g, "$1");
  const values = t.dark !== undefined && t.dark !== t.value ? `Light ${t.value}, dark ${t.dark}.` : `${t.value}.`;
  await add({
    url: `/tokens/?q=${encodeURIComponent(name)}`,
    // The name once: spelled out again, a short record outranks the page that explains it.
    content: `${name}. ${purpose} ${values}`,
    meta: { title: name, kind: "Token", summary: `${purpose} ${values}`.trim(), ...(isColor ? { swatch: t.value } : {}) },
  });
}

// Classes: one result per block (.ply-note) that also lists its parts and variants
// (.ply-note__mark, .ply-note--soft), so any of them finds it without flooding the list.
const cssPage = {
  "button.css": "/components/buttons/", "tag.css": "/components/buttons/", "nav.css": "/components/navigation/",
  "search.css": "/components/navigation/", "note.css": "/components/notes/", "form.css": "/components/forms/",
  "table.css": "/components/tables/", "code.css": "/components/code/", "machine.css": "/components/machine/", "atlas.css": "/components/atlas/",
  "research.css": "/components/research/", "writing.css": "/components/writing/", "demo.css": "/components/demo/",
  "viz.css": "/components/charts/", "panel.css": "/components/", "layout.css": "/foundations/layout/",
  "utilities.css": "/foundations/layout/",
};
const blocks = new Map();
for (const [file, page] of Object.entries(cssPage)) {
  const path = file === "layout.css" || file === "utilities.css" ? join(root, "css/src", file) : join(root, "css/src/components", file);
  const css = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, cls] of css.matchAll(/\.(ply-[a-z0-9]+(?:(?:-|--|__)[a-z0-9]+)*)/g)) {
    const block = cls.split(/--|__/)[0];
    if (!blocks.has(block)) blocks.set(block, { page: block.startsWith("ply-complex") ? "/components/complex/" : page, classes: new Set() });
    blocks.get(block).classes.add(cls);
  }
}
for (const [block, { page, classes }] of blocks) {
  const parts = [...classes].filter((c) => c !== block);
  const where = labels[page] ?? "Components";
  const shown = parts.slice(0, 3).map((c) => `.${c}`).join(", ");
  await add({
    url: page + fragment(block),
    content: `.${block} ${block.replace(/^ply-/, "").replace(/-/g, " ")}. ${parts.map((c) => `.${c}`).join(" ")} Documented in ${where}.`,
    meta: {
      title: `.${block}`, kind: "Class",
      summary: `Documented in ${where}.${parts.length ? ` With ${shown}${parts.length > 3 ? `, and ${parts.length - 3} more` : ""}.` : ""}`,
    },
  });
}

// Astro components: each one with the summary from the top of its file.
const shownIn = {
  Chart: "/components/charts/", Exhibit: "/components/", Pager: "/components/navigation/", SideNav: "/components/navigation/",
  Toc: "/components/navigation/", TopBar: "/components/navigation/", Search: "/components/navigation/",
  ThemeToggle: "/components/navigation/", Tag: "/components/buttons/", Mast: "/foundations/layout/",
  Atlas: "/components/atlas/", AtlasStop: "/components/atlas/", Seo: "/getting-started/seo/",
};
for (const file of readdirSync(join(root, "astro")).filter((f) => f.endsWith(".astro"))) {
  const name = file.replace(/\.astro$/, "");
  const src = readFileSync(join(root, "astro", file), "utf8");
  const comment = (src.match(/^---\n((?:\/\/.*\n)+)/) ?? [, ""])[1].replace(/^\/\/ ?/gm, "").replace(/\s+/g, " ").trim();
  // The first sentence only: later comment lines often hold a usage example.
  const summary = (comment.match(/^.*?\.(?=\s|$)/) ?? [comment])[0];
  const docPages = pages.filter((p) => p.source.includes(`astro/${name}.astro`) || p.source.includes(`<${name} `) || p.source.includes(`<${name}>`));
  const url = docPages.find((p) => p.url.startsWith("/components/") && p.url !== "/components/")?.url ?? shownIn[name] ?? docPages[0]?.url ?? "/components/";
  await add({
    url: url + fragment(`<${name}`),
    content: `${name} ${summary} An Astro component, shown in ${labels[url] ?? "Components"}.`,
    meta: { title: `<${name}>`, kind: "Astro component", summary: summary || `Shown in ${labels[url] ?? "Components"}.` },
  });
}

const written = await index.writeFiles({ outputPath: join(dist, "pagefind") });
if (written.errors.length) fail("could not write the index", written.errors);
await pagefind.close();
console.log(`search index: ${added.page_count} pages and ${records} records (tokens, class blocks, components); ${named} headings given ids`);
