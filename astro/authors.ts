// Long author lists (a challenge report can have dozens of names) fold the same way in every
// component: past `over` names, the first half of `over`, yours, and the last author (often
// the lead of the group), with a gap where names are left out.

/** Whether the name at index `i` of `count` stays in a folded list, with yours at `me`. */
export const keptWhenFolded = (count: number, me: number, over: number) => (i: number) =>
  i < Math.ceil(over / 2) || i === me || i === count - 1;

/** The names a list shows: whole when it has `over` names or fewer, else folded with "..."
 *  in each gap. */
export function foldAuthors(authors: string[], me?: string, over = 12) {
  if (authors.length <= over) return authors;
  const kept = keptWhenFolded(authors.length, me ? authors.indexOf(me) : -1, over);
  return authors.flatMap((a, i) => (kept(i) ? [a] : kept(i - 1) ? ["..."] : []));
}
