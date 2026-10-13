// Shared by the paper and post headers: what their wood-type titles need to set well.
// A short hyphenated term ("Test-Time") is kept on one line; a longer one may still break
// at its hyphens. `len` and `chars` feed the title's size (--_len and --_chars in CSS):
// the title's length, and its longest unbreakable run of characters.
const KEEP = 16;

export function woodTitle(title: string) {
  // Odd entries are the hyphenated terms.
  const parts = title.split(/(\S+-\S+)/).map((text, i) => ({ text, keep: i % 2 === 1 && text.length <= KEEP }));
  const runs = title.split(/\s+/).flatMap((w) => (w.length > KEEP ? w.split(/(?<=-)/) : [w]));
  return { parts, len: title.length, chars: Math.max(1, ...runs.map((w) => w.length)) };
}
