#!/usr/bin/env node
// polytope-design: copy Polytope's DESIGN.md and .impeccable/design.json into the current
// project, so Impeccable treats Polytope as the project's visual system.
//
//   npx @dario-loi/polytope            copy both files (refuses to replace another system's DESIGN.md)
//   npx @dario-loi/polytope --check    exit 1 if the project's copies differ from the installed version
//   npx @dario-loi/polytope --force    replace an existing DESIGN.md even if it is not Polytope's

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version;
const files = [
  { from: join(pkg, "DESIGN.md"), to: join(process.cwd(), "DESIGN.md"), label: "DESIGN.md" },
  { from: join(pkg, "dist", "design.json"), to: join(process.cwd(), ".impeccable", "design.json"), label: ".impeccable/design.json" },
];
const args = new Set(process.argv.slice(2));
const isPolytope = (path) => /^name:\s*Polytope\s*$/m.test(readFileSync(path, "utf8").split("\n---")[0]);

for (const f of files) {
  if (!existsSync(f.from)) {
    console.error(`Missing ${f.from}. Reinstall @dario-loi/polytope.`);
    process.exit(2);
  }
}

if (args.has("--check")) {
  const stale = files.filter((f) => !existsSync(f.to) || readFileSync(f.to, "utf8") !== readFileSync(f.from, "utf8"));
  if (stale.length) {
    console.error(`Out of date with @dario-loi/polytope ${version}: ${stale.map((f) => f.label).join(", ")}. Run npx @dario-loi/polytope.`);
    process.exit(1);
  }
  console.log(`DESIGN.md and design.json match Polytope ${version}.`);
  process.exit(0);
}

const design = files[0];
if (existsSync(design.to) && !isPolytope(design.to) && !args.has("--force")) {
  console.error("This project already has a DESIGN.md for a different system. Run with --force to replace it with Polytope's.");
  process.exit(1);
}

for (const f of files) {
  mkdirSync(dirname(f.to), { recursive: true });
  writeFileSync(f.to, readFileSync(f.from, "utf8"));
  console.log(`wrote ${f.label}`);
}
console.log(`Polytope ${version} is now this project's design system.`);
if (!existsSync(join(process.cwd(), "PRODUCT.md"))) {
  console.log("Next: run /impeccable init in Claude Code to describe this site in PRODUCT.md.");
}
