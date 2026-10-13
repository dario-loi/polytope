// What the wood-type titles need to set well: the mast title, the paper and post headers, and
// WoodTitle. A title sizes to its column through CSS, from two numbers written here:
//   --_em   the width of its longest unbreakable run, in em, so that run never breaks;
//   --_len  its length in characters, so a long title takes longer lines.
// Widths come from a table of Ultra's advances, taking the wider of Ultra and its metric
// fallback for each character, so a run fits in either face.

// Advance of each character from space (32) to tilde (126), in hundredths of an em.
const ADVANCE = [31,46,62,86,78,107,98,32,54,54,59,86,40,46,40,57,85,59,76,76,79,73,79,67,82,79,44,44,86,86,86,67,118,92,92,87,102,88,82,98,111,54,73,99,83,125,102,100,85,100,97,79,83,102,93,137,98,89,84,54,57,54,86,86,61,74,79,65,81,70,53,77,83,46,42,85,46,124,84,77,80,80,64,63,52,82,69,105,73,71,64,61,47,61,86];
// Letters outside the table (accented and other scripts) count as a wide lowercase letter.
const OTHER = 85;
// A run never sets wider than its table width times this, with tracking and rounding.
const SAFE = 1.03;

// Chinese, Japanese, and Korean text breaks between any two characters, so each of its
// characters is a run of its own, a full em wide.
const CJK = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/u;

/** Width of a run of text in Ultra, in em. */
export function emWidth(text: string) {
  let w = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    w += c >= 32 && c < 127 ? ADVANCE[c - 32] : CJK.test(ch) ? 100 : OTHER;
  }
  return Math.round((w / 100) * SAFE * 100) / 100;
}

/** The width in em of the widest run a line cannot break inside. */
export function longestRun(text: string) {
  const runs = text.split(/\s+/).flatMap((w) => (CJK.test(w) ? w.split(CJK) : [w]));
  return Math.max(0.5, ...runs.map(emWidth), CJK.test(text) ? 1.03 : 0);
}

// A short hyphenated term ("Test-Time") is kept on one line; a longer one may still break at
// its hyphens.
const KEEP = 16;

/** A title split into the parts to keep whole (`keep`), with its length and longest run. */
export function woodTitle(title: string) {
  // Odd entries are the hyphenated terms.
  const parts = title.split(/(\S+-\S+)/).map((text, i) => ({ text, keep: i % 2 === 1 && text.length <= KEEP }));
  const runs = title.split(/\s+/).flatMap((w) => (w.length > KEEP ? w.split(/(?<=-)/) : [w]));
  return { parts, len: title.length, em: Math.max(...runs.map(longestRun)) };
}

/** The style that sizes a wood-type title: `--_len` and `--_em`. */
export const titleStyle = (t: { len: number; em: number }) => `--_len: ${t.len}; --_em: ${t.em}`;

/** "Name: what it does" as the name and the subtitle; a title without a subtitle has none. */
export function splitTitle(title: string) {
  const cut = title.indexOf(": ");
  return cut > 0 && cut + 2 < title.length ? { name: title.slice(0, cut), sub: title.slice(cut + 2) } : { name: title, sub: undefined };
}
