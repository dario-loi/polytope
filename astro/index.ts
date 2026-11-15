// Astro components for the Polytope.
// Import the CSS once in your layout:  import "@dario-loi/polytope/css";
// Equation and M bring KaTeX's stylesheet themselves, on the pages that use them. Tex and
// KatexAssets are for a page that keeps math in its data and cares about its first paint.
export { default as Abstract } from "./Abstract.astro";
export { default as AppShell } from "./AppShell.astro";
export { default as Article } from "./Article.astro";
export { default as Atlas } from "./Atlas.astro";
export { default as AtlasStop } from "./AtlasStop.astro";
export { default as BackToTop } from "./BackToTop.astro";
export { default as BibTeX } from "./BibTeX.astro";
export { default as Button } from "./Button.astro";
export { default as Card } from "./Card.astro";
export { default as CardGrid } from "./CardGrid.astro";
export { default as Chart } from "./Chart.astro";
export { default as Cite } from "./Cite.astro";
export { default as Code } from "./Code.astro";
export { default as Complex } from "./Complex.astro";
export { default as ComplexMark } from "./ComplexMark.astro";
export { default as ComplexStatic } from "./ComplexStatic.astro";
export { default as DatedList } from "./DatedList.astro";
export { default as Empty } from "./Empty.astro";
export { default as Env } from "./Env.astro";
export { default as Equation } from "./Equation.astro";
export { default as Exhibit } from "./Exhibit.astro";
export { default as Figure } from "./Figure.astro";
export { default as Icon } from "./Icon.astro";
export { default as KatexAssets } from "./KatexAssets.astro";
export { default as Loading } from "./Loading.astro";
export { default as Lost } from "./Lost.astro";
export { default as M } from "./M.astro";
export { default as Machine } from "./Machine.astro";
export { default as Mast } from "./Mast.astro";
export { default as MastTitle } from "./MastTitle.astro";
export { default as Model } from "./Model.astro";
export { default as Note } from "./Note.astro";
export { default as Pager } from "./Pager.astro";
export { default as PaperHeader } from "./PaperHeader.astro";
export { default as PlotSvg } from "./PlotSvg.astro";
export { default as PostHeader } from "./PostHeader.astro";
export { default as PubList } from "./PubList.astro";
export { default as Readout } from "./Readout.astro";
export { default as References } from "./References.astro";
export { default as SectionHead } from "./SectionHead.astro";
export { default as Seo } from "./Seo.astro";
export { default as SideNav } from "./SideNav.astro";
export { default as Sidenote } from "./Sidenote.astro";
export { default as SiteFooter } from "./SiteFooter.astro";
export { default as Slider } from "./Slider.astro";
export { default as Stability } from "./Stability.astro";
export { default as Status } from "./Status.astro";
export { default as Tag } from "./Tag.astro";
export { default as Tex } from "./Tex.astro";
export { default as ThemeToggle } from "./ThemeToggle.astro";
export { default as ThemedImage } from "./ThemedImage.astro";
export { default as Tldr } from "./Tldr.astro";
export { default as Toc } from "./Toc.astro";
export { default as TopBar } from "./TopBar.astro";
export { default as WoodTitle } from "./WoodTitle.astro";
// Helpers the components use, for markup of your own: title sizing and folded author lists.
export { emWidth, longestRun, splitTitle, titleStyle, woodTitle } from "./title.ts";
export { foldAuthors, keptWhenFolded } from "./authors.ts";
// Picture helpers: formats, the phone column for `sizes`, and width steps.
export { column, pictureFormats, widthsFor } from "./images.ts";
// The complex's generator, for a drawing of your own, a seed from a name, and the reference list's helpers.
export { complexLayout, seedOf } from "./complex.ts";
export type { ComplexLayout } from "./complex.ts";
export { byAuthorYear, refAuthors, refHref } from "./references.ts";
export type { Reference } from "./references.ts";
// Text from data: inline math and emphasis helpers, and the test for a page that needs KaTeX.
export { emphasis, hasMath, plain } from "./tex.ts";
