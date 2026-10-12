// Build every distributable from tokens/tokens.json and css/.
// Outputs: dist/tokens.css, dist/tokens.json, dist/tokens.mjs, dist/fonts/,
// dist/polytope.css (fonts + tokens + all components), dist/css/*.css, dist/js/*.js,
// dist/token-usage.json, and the Python theme's generated modules.
// No dependencies beyond Node's standard library.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const src = JSON.parse(readFileSync(join(root, "tokens/tokens.json"), "utf8"));

rmSync(dist, { recursive: true, force: true });
for (const d of ["", "css", "js", "fonts"]) mkdirSync(join(dist, d), { recursive: true });

// ---------------------------------------------------------------- tokens

const isToken = (n) => n && typeof n === "object" && "$value" in n;

function walk(node, path, out) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$")) continue;
    if (isToken(v)) out.push({ path: [...path, k], token: v });
    else if (v && typeof v === "object" && !Array.isArray(v)) walk(v, [...path, k], out);
  }
  return out;
}

// CSS custom property name for a token path.
function cssName(path) {
  const [group, ...rest] = path;
  if (group === "primitive") return "--ply-" + rest.slice(1).join("-"); // primitive.color.ink.950 -> --ply-ink-950
  if (group === "theme") return "--ply-color-" + rest.slice(2).join("-"); // theme.light.color.bg -> --ply-color-bg
  if (group === "font") {
    const [kind, ...name] = rest;
    const prefix = { family: "font", size: "size", weight: "weight", leading: "leading" }[kind];
    return `--ply-${prefix}-${name.join("-")}`;
  }
  if (group === "motion") return `--ply-${rest.join("-")}`; // motion.duration.fast -> --ply-duration-fast
  if (group === "layout") return `--ply-layout-${rest.join("-")}`;
  return `--ply-${path.join("-")}`; // space.4 -> --ply-space-4, border.rule -> --ply-border-rule
}

const all = walk(src, [], []);
const byPath = new Map(all.map((t) => [t.path.join("."), t]));

function resolve(value, seen = new Set()) {
  if (typeof value !== "string") return value;
  const m = value.match(/^\{(.+)\}$/);
  if (!m) return value;
  if (seen.has(m[1])) throw new Error(`Alias cycle at ${m[1]}`);
  seen.add(m[1]);
  const target = byPath.get(m[1]);
  if (!target) throw new Error(`Unknown alias {${m[1]}}`);
  return resolve(target.token.$value, seen);
}

function cssValue(value) {
  const m = typeof value === "string" && value.match(/^\{(.+)\}$/);
  return m ? `var(${cssName(m[1].split("."))})` : String(value);
}

const decl = (list) => list.map((t) => `  ${cssName(t.path)}: ${cssValue(t.token.$value)};`).join("\n");

const statics = all.filter((t) => t.path[0] !== "theme");
const light = all.filter((t) => t.path[0] === "theme" && t.path[1] === "light");
const dark = all.filter((t) => t.path[0] === "theme" && t.path[1] === "dark");

const viz = src.viz;
const vizDecl = (mode) =>
  viz.categorical[mode].map((hex, i) => `  --ply-viz-${i + 1}: ${hex};`).join("\n") + `\n  --ply-viz-surface: ${viz.surface[mode]};`;
const vizStatic = [
  ...viz.sequential.map((hex, i) => `  --ply-viz-seq-${i + 1}: ${hex};`),
  ...viz.diverging.map((hex, i) => `  --ply-viz-div-${i + 1}: ${hex};`),
  ...Object.entries(viz.status).map(([k, hex]) => `  --ply-status-${k}: ${hex};`),
].join("\n");

// Print overrides on top of the light theme: panels and code become ink on white.
const printDecl = Object.entries({
  panel: "white", "panel-text": "ink-950", "panel-muted": "ink-600", "panel-rule": "ink-200",
  "focus-on-panel": "teal-700",
  "code-comment": "ink-600", "code-keyword": "tomato-600", "code-string": "teal-700", "code-number": "cobalt-600",
}).map(([k, p]) => `    --ply-color-${k}: var(--ply-${p});`).join("\n");

const tokensCss = `/* Generated from tokens/tokens.json. Do not edit by hand. */
:root {
  color-scheme: light dark;
${decl(statics)}
${vizStatic}
}
:root, :root[data-theme="light"] {
  color-scheme: light;
${decl(light)}
${vizDecl("light")}
}
@media screen and (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${decl(dark).replace(/^/gm, "  ")}
${vizDecl("dark").replace(/^/gm, "  ")}
  }
}
@media screen {
  :root[data-theme="dark"] {
    color-scheme: dark;
${decl(dark).replace(/^/gm, "  ")}
${vizDecl("dark").replace(/^/gm, "  ")}
  }
}
/* Paper is always the light theme, and black panels print as ink on white. */
@media print {
  :root {
${printDecl}
  }
}
`;
writeFileSync(join(dist, "tokens.css"), tokensCss);

// Flat JSON for the docs site and for any JavaScript consumer.
const flat = {};
for (const t of statics) {
  flat[cssName(t.path)] = { path: t.path.join("."), type: t.token.$type, value: resolve(t.token.$value), ref: t.token.$value, description: t.token.$description ?? "" };
}
for (const t of light) {
  const name = cssName(t.path);
  const darkTok = byPath.get(["theme", "dark", ...t.path.slice(2)].join("."));
  flat[name] = {
    path: t.path.slice(2).join("."),
    type: t.token.$type,
    value: resolve(t.token.$value),
    ref: t.token.$value,
    dark: darkTok ? resolve(darkTok.token.$value) : undefined,
    darkRef: darkTok ? darkTok.token.$value : undefined,
    description: t.token.$description ?? darkTok?.token.$description ?? "",
  };
}
const tokensOut = { tokens: flat, viz };
writeFileSync(join(dist, "tokens.json"), JSON.stringify(tokensOut, null, 2));
writeFileSync(join(dist, "tokens.mjs"), `// Generated from tokens/tokens.json.\nexport const tokens = ${JSON.stringify(flat, null, 2)};\nexport const viz = ${JSON.stringify(viz, null, 2)};\nexport default { tokens, viz };\n`);

// ---------------------------------------------------------------- other targets

// TypeScript declarations for tokens.mjs.
writeFileSync(
  join(dist, "tokens.d.ts"),
  `// Generated from tokens/tokens.json.
export interface Token { path: string; type?: string; value: string | number; ref: string | number; dark?: string | number; darkRef?: string | number; description: string; }
export type TokenName = ${Object.keys(flat).map((k) => JSON.stringify(k)).join(" | ")};
export declare const tokens: Record<TokenName, Token>;
export declare const viz: {
  categorical: { light: string[]; dark: string[]; names: string[] };
  sequential: string[]; diverging: string[];
  status: { good: string; warning: string; serious: string; critical: string };
  surface: { light: string; dark: string };
};
declare const _default: { tokens: typeof tokens; viz: typeof viz };
export default _default;
`,
);

// SCSS: raw values for build-time math, plus maps for both themes.
const scssName = (n) => "$" + n.slice(2);
const scss = [
  "// Generated from tokens/tokens.json. Prefer the CSS custom properties at runtime;",
  "// these raw values are for build-time Sass that needs real colors.",
  ...statics.map((t) => `${scssName(cssName(t.path))}: ${resolve(t.token.$value)};`),
  ...light.map((t) => `${scssName(cssName(t.path))}: ${resolve(t.token.$value)};`),
  `$ply-theme-dark: (\n${dark.map((t) => `  "${cssName(t.path).slice(11)}": ${resolve(t.token.$value)},`).join("\n")}\n);`,
  `$ply-viz-light: (${viz.categorical.light.join(", ")});`,
  `$ply-viz-dark: (${viz.categorical.dark.join(", ")});`,
].join("\n");
writeFileSync(join(dist, "tokens.scss"), scss + "\n");

// Tailwind v4: map the tokens into Tailwind's theme namespaces. `inline` keeps the
// var() references so the light/dark switch in tokens.css still applies.
const tw = [
  "/* Generated from tokens/tokens.json.",
  "   Use after Tailwind and the tokens:",
  '   @import "tailwindcss"; @import "@dario-loi/polytope/tokens.css"; @import "@dario-loi/polytope/tailwind.css"; */',
  "@theme inline {",
  ...light.map((t) => `  --color-${t.path.slice(3).join("-")}: var(${cssName(t.path)});`),
  ...statics.filter((t) => t.path[0] === "primitive").map((t) => `  --color-${t.path.slice(2).join("-")}: var(${cssName(t.path)});`),
  ...viz.categorical.names.map((n, i) => `  --color-viz-${n}: var(--ply-viz-${i + 1});`),
  ...statics.filter((t) => t.path[0] === "font" && t.path[1] === "family").map((t) => `  --font-${t.path[2]}: var(${cssName(t.path)});`),
  ...statics.filter((t) => t.path[0] === "font" && t.path[1] === "size").map((t) => `  --text-${t.path[2]}: var(${cssName(t.path)});`),
  ...statics.filter((t) => t.path[0] === "font" && t.path[1] === "weight").map((t) => `  --font-weight-${t.path[2]}: var(${cssName(t.path)});`),
  ...statics.filter((t) => t.path[0] === "font" && t.path[1] === "leading").map((t) => `  --leading-${t.path[2]}: var(${cssName(t.path)});`),
  ...statics.filter((t) => t.path[0] === "space").map((t) => `  --spacing-${t.path[1]}: var(${cssName(t.path)});`),
  ...statics.filter((t) => t.path[0] === "radius").map((t) => `  --radius-${t.path[1]}: var(${cssName(t.path)});`),
  ...statics.filter((t) => t.path[0] === "motion" && t.path[1] === "ease").map((t) => `  --ease-${t.path[2]}: var(${cssName(t.path)});`),
  "}",
].join("\n");
writeFileSync(join(dist, "tailwind.css"), tw + "\n");

// LaTeX: xcolor names and a pgfplots cycle list, so TikZ and pgfplots figures match the web.
const texName = (s) => s.replace(/(^|[-.])([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const prim = statics.filter((t) => t.path[0] === "primitive");
const sty = [
  "% Generated from tokens/tokens.json.",
  "% \\usepackage{polytope-colors}  (needs xcolor; the cycle list needs pgfplots)",
  "\\NeedsTeXFormat{LaTeX2e}",
  "\\ProvidesPackage{polytope-colors}[2026/10/11 Polytope colors]",
  "\\RequirePackage{xcolor}",
  ...prim.map((t) => `\\definecolor{ply${texName(t.path.slice(2).join("-"))}}{HTML}{${String(resolve(t.token.$value)).slice(1)}}`),
  ...viz.categorical.light.map((h, i) => `\\definecolor{plyViz${texName(viz.categorical.names[i])}}{HTML}{${h.slice(1)}}`),
  ...Object.entries(viz.status).map(([k, h]) => `\\definecolor{plyStatus${texName(k)}}{HTML}{${h.slice(1)}}`),
  "\\@ifpackageloaded{pgfplots}{%",
  "  \\pgfplotscreateplotcyclelist{polytope}{%",
  ...viz.categorical.names.map((n, i, a) => `    {plyViz${texName(n)}, mark=*, thick}${i < a.length - 1 ? "," : ""}%`),
  "  }%",
  "}{}",
  "\\endinput",
].join("\n");
writeFileSync(join(dist, "polytope-colors.sty"), sty + "\n");

// Code theme in TextMate format, readable by Shiki and VS Code. Code always sits on the
// black panel, so one theme serves both page themes.
const lt = Object.fromEntries(light.map((t) => [t.path.slice(3).join("-"), resolve(t.token.$value)]));
const codeTheme = {
  name: "ply-world-of-numbers",
  type: "dark",
  colors: { "editor.background": lt.panel, "editor.foreground": lt["panel-text"], "editor.selectionBackground": "#E9A81C55", "editorLineNumber.foreground": "#6B6B66", "editorCursor.foreground": "#D9412B" },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: lt["code-comment"], fontStyle: "" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.operator.new", "keyword.control"], settings: { foreground: lt["code-keyword"] } },
    { scope: ["string", "string.quoted", "markup.inline.raw"], settings: { foreground: lt["code-string"] } },
    { scope: ["constant.numeric", "constant.language", "constant.character"], settings: { foreground: lt["code-number"] } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#FFFFFF", fontStyle: "bold" } },
    { scope: ["entity.name.tag", "support.type.property-name", "entity.other.attribute-name"], settings: { foreground: "#F2B83A" } },
    { scope: ["variable", "variable.other", "meta.definition.variable"], settings: { foreground: lt["panel-text"] } },
    { scope: ["entity.name.type", "support.type", "support.class"], settings: { foreground: "#95AEE3" } },
    { scope: ["punctuation", "meta.brace"], settings: { foreground: "#B9BAB4" } },
    { scope: ["markup.heading"], settings: { foreground: "#FFFFFF", fontStyle: "bold" } },
    { scope: ["markup.deleted"], settings: { foreground: "#F0654F" } },
    { scope: ["markup.inserted"], settings: { foreground: "#5CC2C7" } },
  ],
};
writeFileSync(join(dist, "code-theme.json"), JSON.stringify(codeTheme, null, 2));

// Impeccable's design record, so other projects can adopt Polytope as their system
// (see scripts/sync-design.mjs).
if (existsSync(join(root, ".impeccable/design.json"))) copyFileSync(join(root, ".impeccable/design.json"), join(dist, "design.json"));

// The DTCG source itself, for Figma token plugins and other tools that read the format.
copyFileSync(join(root, "tokens/tokens.json"), join(dist, "tokens.dtcg.json"));

// ---------------------------------------------------------------- fonts

const fonts = [
  ["@fontsource/ultra/files/ultra-latin-400-normal.woff2", "ultra-latin-400.woff2"],
  ["@fontsource-variable/libre-franklin/files/libre-franklin-latin-wght-normal.woff2", "libre-franklin-latin-wght.woff2"],
  ["@fontsource-variable/libre-franklin/files/libre-franklin-latin-wght-italic.woff2", "libre-franklin-latin-wght-italic.woff2"],
  ["@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", "jetbrains-mono-latin-wght.woff2"],
];
// The fonts' licenses travel with the files (OFL 1.1 and Apache 2.0 both require it).
const fontLicenses = [
  ["@fontsource/ultra/LICENSE", "LICENSE-Ultra-Apache-2.0.txt"],
  ["@fontsource-variable/libre-franklin/LICENSE", "LICENSE-LibreFranklin-OFL-1.1.txt"],
  ["@fontsource-variable/jetbrains-mono/LICENSE", "LICENSE-JetBrainsMono-OFL-1.1.txt"],
];
let fontsAvailable = true;
for (const [from, to] of fonts) {
  const p = join(root, "node_modules", from);
  if (!existsSync(p)) { fontsAvailable = false; console.warn(`font missing: ${from} (run npm install)`); continue; }
  copyFileSync(p, join(dist, "fonts", to));
}
for (const [from, to] of fontLicenses) {
  const p = join(root, "node_modules", from);
  if (existsSync(p)) copyFileSync(p, join(dist, "fonts", to));
  else { fontsAvailable = false; console.warn(`font license missing: ${from}`); }
}
const range = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const fontsCss = `/* Self-hosted faces. Ultra: Apache 2.0. Libre Franklin and JetBrains Mono: SIL OFL 1.1. License texts: ./fonts/LICENSE-*.txt */
@font-face { font-family: "Ultra"; font-style: normal; font-weight: 400; font-display: swap; src: url("./fonts/ultra-latin-400.woff2") format("woff2"); unicode-range: ${range}; }
/* Fallback faces: installed fonts scaled to the metrics of the self-hosted ones, so text keeps its
   size and line breaks while the real faces load, and nothing moves when they arrive. Each one is a
   single named face, so a browser resolves it once; a list of system family names would be looked
   up again at every size and weight, which is slow where many fonts are installed.
   size-adjust is the width of the docs' titles, ledes, and code in the real face over the same text
   in the fallback, measured in Chromium. The overrides are the real face's ascent, descent, and
   line gap over its em, divided by size-adjust.
   Ultra (ascent 2066, descent 561, gap 0 on 2048): Georgia Bold, on macOS and Windows, at 122.34%;
   where Georgia is missing, Liberation Serif Bold or Times New Roman Bold, which share metrics, at
   147.12%. Linux has Liberation wherever Chrome does. */
@font-face { font-family: "Ultra Fallback"; font-style: normal; font-weight: 400; src: local("Georgia Bold"), local("Georgia-Bold"); size-adjust: 122.34%; ascent-override: 82.46%; descent-override: 22.39%; line-gap-override: 0%; }
@font-face { font-family: "Ultra Fallback Serif"; font-style: normal; font-weight: 400; src: local("Liberation Serif Bold"), local("LiberationSerif-Bold"), local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT"); size-adjust: 147.12%; ascent-override: 68.57%; descent-override: 18.62%; line-gap-override: 0%; }
/* Libre Franklin (ascent 966, descent 246, gap 0 on 1000): Arial, or Liberation Sans, which shares
   its metrics. Regular and medium text measured 102.9% and 104.0% of Arial; semibold and bold,
   98.0% and 99.1% of Arial Bold. Each face takes a value near the weight most text uses. */
@font-face { font-family: "Libre Franklin Fallback"; font-style: normal; font-weight: 100 549; src: local("Arial"), local("ArialMT"), local("Liberation Sans"), local("LiberationSans"); size-adjust: 103%; ascent-override: 93.79%; descent-override: 23.88%; line-gap-override: 0%; }
@font-face { font-family: "Libre Franklin Fallback"; font-style: normal; font-weight: 550 900; src: local("Arial Bold"), local("Arial-BoldMT"), local("Liberation Sans Bold"), local("LiberationSans-Bold"); size-adjust: 98.5%; ascent-override: 98.07%; descent-override: 24.97%; line-gap-override: 0%; }
/* JetBrains Mono (ascent 1020, descent 300, gap 0 on 1000): Menlo, Liberation Mono, or Courier New,
   all 0.6em wide like it. */
@font-face { font-family: "JetBrains Mono Fallback"; font-style: normal; font-weight: 100 800; src: local("Menlo Regular"), local("Menlo-Regular"), local("Liberation Mono"), local("LiberationMono"), local("Courier New"), local("CourierNewPSMT"); ascent-override: 102%; descent-override: 30%; line-gap-override: 0%; }
@font-face { font-family: "Libre Franklin Variable"; font-style: normal; font-weight: 100 900; font-display: swap; src: url("./fonts/libre-franklin-latin-wght.woff2") format("woff2-variations"); unicode-range: ${range}; }
@font-face { font-family: "Libre Franklin Variable"; font-style: italic; font-weight: 100 900; font-display: swap; src: url("./fonts/libre-franklin-latin-wght-italic.woff2") format("woff2-variations"); unicode-range: ${range}; }
@font-face { font-family: "JetBrains Mono Variable"; font-style: normal; font-weight: 100 800; font-display: swap; src: url("./fonts/jetbrains-mono-latin-wght.woff2") format("woff2-variations"); unicode-range: ${range}; }
`;
writeFileSync(join(dist, "fonts.css"), fontsCss);

// ---------------------------------------------------------------- css

// css/src/index.css lists the files in cascade order with @import lines.
const order = readFileSync(join(root, "css/src/index.css"), "utf8")
  .split("\n")
  .map((l) => l.match(/@import\s+["'](.+)["']/))
  .filter(Boolean)
  .map((m) => m[1]);

const layerHeader = "@layer ply.reset, ply.base, ply.layout, ply.components, ply.utilities;\n";
let bundle = `/* Polytope v${JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version}. Generated; edit css/src instead. */\n${layerHeader}${fontsAvailable ? fontsCss : ""}${tokensCss}`;
const usage = {};
for (const file of order) {
  const css = readFileSync(join(root, "css/src", file), "utf8");
  const outName = file.replace(/^components\//, "");
  mkdirSync(dirname(join(dist, "css", outName)), { recursive: true });
  // Each file declares the layer order too, so files linked one by one cascade like the bundle.
  writeFileSync(join(dist, "css", outName), layerHeader + css);
  bundle += `\n/* ---- ${file} ---- */\n${css}`;
  for (const m of css.matchAll(/var\((--ply-[a-z0-9-]+)/g)) {
    (usage[m[1]] ??= new Set()).add(file);
  }
}
writeFileSync(join(dist, "polytope.css"), bundle);
writeFileSync(
  join(dist, "token-usage.json"),
  JSON.stringify(Object.fromEntries(Object.entries(usage).map(([k, v]) => [k, [...v].sort()])), null, 2),
);

for (const f of readdirSync(join(root, "css/js"))) {
  if (f.endsWith(".js")) copyFileSync(join(root, "css/js", f), join(dist, "js", f));
}

// ---------------------------------------------------------------- python

const py = join(root, "python/src/polytope_theme");
mkdirSync(join(py, "styles"), { recursive: true });
const pyTokens = {
  light: Object.fromEntries(light.map((t) => [t.path.slice(3).join("_").replace(/-/g, "_"), resolve(t.token.$value)])),
  dark: Object.fromEntries(dark.map((t) => [t.path.slice(3).join("_").replace(/-/g, "_"), resolve(t.token.$value)])),
};
const pyLiteral = (o) => JSON.stringify(o, null, 4).replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\bnull\b/g, "None");
writeFileSync(
  join(py, "_tokens.py"),
  `"""Generated from tokens/tokens.json by scripts/build.mjs. Do not edit by hand."""\n\n` +
    `COLORS = ${pyLiteral(pyTokens)}\n\n` +
    `CATEGORICAL = ${pyLiteral(viz.categorical)}\n\n` +
    `SEQUENTIAL = ${pyLiteral(viz.sequential)}\n\n` +
    `DIVERGING = ${pyLiteral(viz.diverging)}\n\n` +
    `STATUS = ${pyLiteral(viz.status)}\n\n` +
    `SURFACE = ${pyLiteral(viz.surface)}\n\n` +
    `FONTS = ${pyLiteral({ display: "Ultra", text: "Libre Franklin", mono: "JetBrains Mono" })}\n`,
);

function mplstyle(mode) {
  // matplotlib reads an unquoted "#" as the start of a comment, so colors are written as bare hex.
  const hex = (v) => String(v).replace(/^#/, "");
  const c = Object.fromEntries(Object.entries(pyTokens[mode]).map(([k, v]) => [k, hex(v)]));
  const surface = hex(viz.surface[mode]);
  const cycle = viz.categorical[mode].map((h) => `'${h.slice(1)}'`).join(", ");
  return `# Polytope, matplotlib style (${mode}). Generated; edit tokens/tokens.json.
# Use: plt.style.use("polytope_theme.styles.polytope-${mode}") or polytope_theme.use("${mode}")
figure.facecolor: ${surface}
axes.facecolor: ${surface}
savefig.facecolor: ${surface}
text.color: ${c.text}
axes.labelcolor: ${c.text}
axes.edgecolor: ${c.text_muted}
axes.linewidth: 1.0
axes.titleweight: bold
axes.titlesize: 13
axes.titlelocation: left
axes.labelsize: 11
axes.spines.top: False
axes.spines.right: False
axes.grid: True
axes.grid.axis: y
axes.axisbelow: True
grid.color: ${c.rule}
grid.linewidth: 0.8
xtick.color: ${c.text_muted}
ytick.color: ${c.text_muted}
xtick.labelsize: 10
ytick.labelsize: 10
legend.frameon: False
legend.fontsize: 10
lines.linewidth: 2.0
lines.markersize: 6
patch.linewidth: 0
font.family: sans-serif
font.sans-serif: Libre Franklin, Franklin Gothic Medium, Helvetica Neue, Arial, DejaVu Sans
font.monospace: JetBrains Mono, DejaVu Sans Mono
mathtext.fontset: cm
axes.prop_cycle: cycler('color', [${cycle}])
image.cmap: Blues
`;
}
writeFileSync(join(py, "styles/polytope-light.mplstyle"), mplstyle("light"));
writeFileSync(join(py, "styles/polytope-dark.mplstyle"), mplstyle("dark"));

console.log(`built ${relative(root, dist)}/: ${statics.length + light.length} tokens, ${order.length} css files, fonts ${fontsAvailable ? "ok" : "MISSING"}`);
