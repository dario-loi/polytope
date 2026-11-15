// Inline math and emphasis in text that comes from data (front matter, a JSON file, a CMS): the
// helpers Tex.astro uses, and the ones a page needs to ask whether any text it shows has math, so
// it loads KaTeX's stylesheet only then.
//   const math = hasMath(paper.tldr, paper.abstract);   // pass it to <KatexAssets /> in the head

/** `$...$` is a formula; write a literal dollar sign as `\$`. */
export const MATH = /(?<!\\)\$(.+?)(?<!\\)\$/g;

// *italic*, **bold**, and ***both***, as in Markdown. A marker hugs its words, so a lone * stays put.
const BOTH = /\*\*\*(?=\S)(.+?)(?<=\S)\*\*\*/g;
const BOLD = /\*\*(?=\S)(.+?)(?<=\S)\*\*/g;
const ITALIC = /(?<![*\\\w])\*(?![\s*])(.+?)(?<![\s*\\])\*(?![*\w])/g;

/** The markers as <em> and <strong>. */
export const emphasis = (s: string) =>
  s.replace(BOTH, "<em><strong>$1</strong></em>").replace(BOLD, "<strong>$1</strong>").replace(ITALIC, "<em>$1</em>");

/** The text as plain text: the markers dropped, for a search description, a feed, or a schema.org record. */
export const plain = (s: string) => s.replace(BOTH, "$1").replace(BOLD, "$1").replace(ITALIC, "$1");

/** Whether any of the texts has a formula. */
export const hasMath = (...texts: (string | undefined)[]) => texts.some((t) => t && new RegExp(MATH.source).test(t));
