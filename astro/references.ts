// Helpers for a reference list kept as data: the form References.astro takes, authors as a
// reference list prints them, the address a title links to, and author-year order.

/** One work in a paper's reference list. */
export interface Reference {
  /** The entry's anchor on the page, #ref-<key>. */
  key: string;
  authors: string[];
  year: number | string;
  title: string;
  venue?: string;
  /** The address the title links to (see refHref). */
  href?: string;
  /** A second link after the entry, such as an arXiv copy; `label` names it for a screen reader too. */
  alt?: { label: string; href: string };
  /** How the body cites it ("Bodnar et al., 2022"), for sorting and for rehype-cite-links. */
  cite?: string[];
}

/** Authors as a reference list prints them: all of up to six, else the first six and "et al." */
export const refAuthors = (a: string[]) =>
  a.length > 6 ? `${a.slice(0, 6).join(", ")}, et al.` : a.length > 2 ? `${a.slice(0, -1).join(", ")}, and ${a.at(-1)}` : a.join(" and ");

/** The address a title links to: the DOI, else the version of record, else arXiv. */
export const refHref = (r: { doi?: string; url?: string; arxiv?: string }) =>
  r.doi ? `https://doi.org/${r.doi}` : (r.url ?? (r.arxiv ? `https://arxiv.org/abs/${r.arxiv}` : undefined));

/** Author-year order: by the citation as the body writes it, else by first author's surname and year. */
export const byAuthorYear = (a: Reference, b: Reference) => {
  const key = (r: Reference) => (r.cite?.[0] ?? `${r.authors[0].trim().split(/\s+/).at(-1)} ${r.year}`).toLowerCase();
  return key(a).localeCompare(key(b));
};
