// Chapters and pages. Order here is the reading order, and drives the pager.
export interface Page { label: string; path: string; }
export interface Chapter { label: string; path: string; pages: Page[] }

export const chapters: Chapter[] = [
  { label: "Getting started", path: "/", pages: [
    { label: "Introduction", path: "/" },
    { label: "Installation", path: "/getting-started/installation/" },
    { label: "Using with Astro", path: "/getting-started/astro/" },
    { label: "Using in plain HTML", path: "/getting-started/html/" },
    { label: "Python and figures", path: "/getting-started/python/" },
    { label: "Other targets", path: "/getting-started/targets/" },
    { label: "Versioning", path: "/getting-started/versioning/" },
  ] },
  { label: "Principles", path: "/principles/", pages: [{ label: "Principles", path: "/principles/" }] },
  { label: "Foundations", path: "/foundations/", pages: [
    { label: "Overview", path: "/foundations/" },
    { label: "Color", path: "/foundations/color/" },
    { label: "Typography", path: "/foundations/typography/" },
    { label: "Space and layout", path: "/foundations/layout/" },
    { label: "Motion", path: "/foundations/motion/" },
    { label: "Icons", path: "/foundations/icons/" },
    { label: "Charts", path: "/foundations/charts/" },
  ] },
  { label: "Tokens", path: "/tokens/", pages: [{ label: "All tokens", path: "/tokens/" }] },
  { label: "Components", path: "/components/", pages: [
    { label: "Overview", path: "/components/" },
    { label: "Buttons and tags", path: "/components/buttons/" },
    { label: "Navigation", path: "/components/navigation/" },
    { label: "Notes", path: "/components/notes/" },
    { label: "Forms", path: "/components/forms/" },
    { label: "Tables", path: "/components/tables/" },
    { label: "Code", path: "/components/code/" },
    { label: "Complex", path: "/components/complex/" },
    { label: "Atlas", path: "/components/atlas/" },
    { label: "Probability machine", path: "/components/machine/" },
    { label: "Research", path: "/components/research/" },
    { label: "Long-form writing", path: "/components/writing/" },
    { label: "Demo chrome", path: "/components/demo/" },
    { label: "Charts", path: "/components/charts/" },
  ] },
  { label: "Patterns", path: "/patterns/", pages: [
    { label: "Overview", path: "/patterns/" },
    { label: "Homepage", path: "/patterns/homepage/" },
    { label: "Paper page", path: "/patterns/paper/" },
    { label: "Demo page", path: "/patterns/demo/" },
    { label: "CV page", path: "/patterns/cv/" },
  ] },
  { label: "Accessibility", path: "/accessibility/", pages: [{ label: "Accessibility", path: "/accessibility/" }] },
  { label: "Writing", path: "/writing/", pages: [{ label: "Writing", path: "/writing/" }] },
  { label: "Changelog", path: "/changelog/", pages: [{ label: "Changelog", path: "/changelog/" }] },
];

export const base = import.meta.env.BASE_URL.replace(/\/$/, "");
export const u = (path: string) => `${base}${path}`;

export function locate(path: string) {
  const clean = path.replace(base, "") || "/";
  const norm = clean.endsWith("/") ? clean : clean + "/";
  const flat = chapters.flatMap((c) => c.pages.map((p) => ({ ...p, chapter: c })));
  const i = flat.findIndex((p) => p.path === norm);
  return {
    chapter: i >= 0 ? flat[i].chapter : chapters[0],
    page: i >= 0 ? flat[i] : undefined,
    prev: i > 0 ? flat[i - 1] : undefined,
    next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : undefined,
  };
}
