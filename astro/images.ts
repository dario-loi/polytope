// Helpers for pictures that keep a phone from fetching more than it shows. Astro's <Picture>
// takes `widths` and `sizes`; these write both, and the formats to offer.
//   <Picture {...pictureFormats} src={img} widths={widthsFor(img, 720)} sizes={`(min-width: 64rem) 30vw, ${column()}`} alt="" />

/** Formats for every <Picture>: AVIF where the browser takes it, else WebP. */
export const pictureFormats = { formats: ["avif", "webp"] as ("avif" | "webp")[], fallbackFormat: "webp" as const };

/** The page column's width on a phone, for `sizes`: the viewport less the container's two
 *  gutters. "100vw" overstates it by a tenth, which is enough for a phone to fetch the next size
 *  up. The default is --ply-layout-gutter (clamp(1rem, 0.2rem + 4vw, 4.5rem)); pass another
 *  clamp for a site that sets its own. A `sizes` value cannot read a custom property. */
export function column(gutter = "clamp(1rem, 0.2rem + 4vw, 4.5rem)") {
  return `calc(100vw - 2 * ${gutter})`;
}

const STEPS = [360, 480, 640, 720, 840, 1024, 1280, 1600, 2048];

/** Widths to offer for a picture shown at most `maxCss` CSS pixels wide: close steps, so the one a
 *  screen picks is never much larger than it shows, up to three device pixels a CSS pixel and
 *  never past the source. */
export function widthsFor(src: { width: number }, maxCss: number, steps: number[] = STEPS) {
  const top = Math.min(src.width, maxCss * 3);
  return [...steps.filter((w) => w < top), top];
}
