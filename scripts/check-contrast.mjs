// Fails if any text/background pair the components use drops below WCAG AA.
// Run after `npm run build`: node scripts/check-contrast.mjs
import { readFileSync } from "node:fs";

const { tokens } = JSON.parse(readFileSync(new URL("../dist/tokens.json", import.meta.url), "utf8"));
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const v = (name, mode) => { const t = tokens[`--ply-${name}`]; return mode === "dark" && t.dark !== undefined ? t.dark : t.value; };

// [foreground, background, minimum, note]
const pairs = [
  ["color-text", "color-bg", 4.5], ["color-text-muted", "color-bg", 4.5], ["color-text-subtle", "color-bg", 4.5],
  ["color-text", "color-surface-sunken", 4.5], ["color-text-muted", "color-surface-sunken", 4.5],
  ["color-link", "color-bg", 4.5], ["color-link", "color-surface-sunken", 4.5], ["color-accent-text", "color-bg", 4.5],
  ["color-panel-text", "color-panel", 4.5], ["color-panel-muted", "color-panel", 4.5],
  ["color-code-comment", "color-panel", 4.5], ["color-code-keyword", "color-panel", 4.5], ["color-code-string", "color-panel", 4.5], ["color-code-number", "color-panel", 4.5],
  ["ink-950", "color-note", 4.5, "note text"], ["color-flag-text", "color-flag", 4.5, "label on a figure"], ["color-text", "color-note-soft", 4.5],
  ["color-bg", "color-text", 4.5, "inverted tab and button"],
  ["color-accent", "color-bg", 3, "non-text: points, balls"], ["color-focus", "color-bg", 3, "focus ring"], ["color-focus-on-panel", "color-panel", 3, "focus ring on panel"],
  ["color-rule-strong", "color-bg", 3, "control borders"],
  ["color-on-accent", "color-accent-text", 4.5, "hovered button label"],
  ["ink-950", "color-note", 3, "focus ring on a note"], ["color-focus", "color-note-soft", 3, "focus ring on a soft note"],
  ["color-focus", "color-surface-sunken", 3, "focus ring on info and success notes"], ["color-focus-on-panel", "ink-950", 3, "focus ring on a danger note"],
];
let failed = 0;
for (const mode of ["light", "dark"]) {
  for (const [fg, bg, min, note] of pairs) {
    const r = ratio(v(fg, mode), v(bg, mode));
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "pass" : "FAIL"}  ${mode.padEnd(5)} ${fg} on ${bg}: ${r.toFixed(2)} (min ${min})${note ? "  " + note : ""}`);
  }
}
if (failed) { console.error(`\n${failed} pair(s) below minimum`); process.exit(1); }
console.log("\nall pairs pass");
