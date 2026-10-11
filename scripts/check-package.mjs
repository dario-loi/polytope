// Fails if a file in the npm package points at a relative path the package does not ship.
// Checks imports in astro/ and dist/js/, and @import and url() in dist/ CSS, against `npm pack --dry-run`.
// Run after `npm run build`: node scripts/check-package.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: root, encoding: "utf8" }));
// npm 10 and 11 print an array of packs; npm 12 prints an object keyed by package name.
const pack = Array.isArray(out) ? out[0] : Object.values(out)[0];
const shipped = new Set(pack.files.map((f) => f.path));

const patterns = {
  code: [/\bimport\s+["'](\.{1,2}\/[^"']+)["']/g, /\bfrom\s+["'](\.{1,2}\/[^"']+)["']/g, /\bimport\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g],
  css: [/@import\s+["'](\.{1,2}\/[^"']+)["']/g, /url\(\s*["']?(\.{1,2}\/[^"')]+)["']?\s*\)/g],
};

let failed = 0;
let checked = 0;
for (const file of shipped) {
  const kind = /\.(astro|ts|mjs|js)$/.test(file) ? "code" : /\.css$/.test(file) ? "css" : null;
  if (!kind || !(file.startsWith("astro/") || file.startsWith("dist/"))) continue;
  const text = readFileSync(join(root, file), "utf8");
  for (const re of patterns[kind]) {
    for (const [, spec] of text.matchAll(re)) {
      checked++;
      const target = normalize(join(dirname(file), spec.split(/[?#]/)[0]));
      if (!shipped.has(target)) {
        failed++;
        console.log(`FAIL  ${file} -> ${spec} (${target} is not in the package)`);
      }
    }
  }
}
if (failed) { console.error(`\n${failed} relative reference(s) point outside the package`); process.exit(1); }
console.log(`${checked} relative references, all shipped (${shipped.size} files in the package)`);
