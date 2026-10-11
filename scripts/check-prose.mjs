// Fails if an en dash (U+2013) or em dash (U+2014) appears in project prose or in the
// built docs. The project's writing rules forbid them; this guard does not depend on
// the design detector. Run: node scripts/check-prose.mjs
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const roots = ["docs/src", "astro", "css", "tokens", "python/README.md", "python/src", "README.md", "PRODUCT.md", "DESIGN.md", "docs/dist"];
const exts = new Set([".astro", ".ts", ".js", ".mjs", ".css", ".json", ".md", ".py", ".html"]);
const bad = /[–—]/;
const hits = [];

function walk(p) {
  if (!existsSync(p)) return;
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const f of readdirSync(p)) if (f !== "node_modules" && f !== "kit" && f !== "_astro") walk(join(p, f));
    return;
  }
  if (!exts.has(extname(p))) return;
  readFileSync(p, "utf8").split("\n").forEach((line, i) => {
    if (bad.test(line)) hits.push(`${relative(root, p)}:${i + 1}: ${line.trim().slice(0, 100)}`);
  });
}
for (const r of roots) walk(join(root, r));
if (hits.length) {
  console.error(`Found ${hits.length} line(s) with an en or em dash:\n` + hits.join("\n"));
  process.exit(1);
}
console.log("no en or em dashes");
