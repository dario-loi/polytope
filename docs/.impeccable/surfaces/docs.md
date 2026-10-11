---
version: 1
slug: "docs"
primary_target: "docs"
related_targets: []
---

# Surface brief: Polytope docs site

Scope: the documentation site in `docs/` for Polytope (made by Dario Loi) (Getting started, Principles, Foundations, Tokens, Components, Patterns, Accessibility, Writing, Changelog). Visitor mode: Read. The pattern pages (homepage, paper page, demo) are example surfaces in the same world.

Audience and job: someone building a new project with Polytope (first of all its author, Dario Loi) needs the install line, the token or component he wants, and copyable code within a minute. Academics, recruiters, and students meet the same world on the public pages built with it, so the docs also show what those pages look like, using the example persona John Doe.

Constraints: static output, free hosting, no invented publications or claims; example content is labeled as example.

## Direction contract

THESIS: The system shown as a hands-on mathematics exhibition. Each chapter opens like an exhibit with a working model in a black panel. Refuses the default docs look (grey sidebar, Inter, blue links) and the retro default of cream and mustard.

OWN-WORLD: White gallery ground, exhibit-black #141414 panels and 3px rules, tomato #D9412B as the one moving part (where you are, the balls), mustard #E9A81C for notes, teal #0F6E73 for links. Ultra wood-type slab for titles only, Libre Franklin for everything read, JetBrains Mono for code. Square corners, round balls, black wall-label tabs.

STORY: The reader learns what the kit is, installs it in under a minute, finds any token or component by chapter, and leaves with code to paste.

FIRST VIEWPORT: Top bar with the Ultra wordmark at left, nine chapter links with a black wall-label tab on the current one, search at right. Mast: two-line Ultra title ending in a tomato full stop (about 92px) with the lede under it; at right a 560px black panel running the probability machine, caption below. Under a 3px rule: chapter sidebar, a 36rem reading column (about 68 characters), on-this-page list. Every chapter landing carries its own working model in the mast exhibit slot. Signature interaction: the machine drops balls live on load and settles into a bell curve (reduced motion shows the settled state); the same machine is the loading indicator; Changelog and publication lists are a history wall.

FORM: A World of Numbers, after the 1961 Eames mathematics exhibition. User-requested retro alternative after a bolder re-roll, so it sits outside the ordered list. Seed key 079c8a29.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

- Published at github.com/dario-loi/polytope (Apache 2.0); docs on GitHub Pages.
- npm publishing; until then packages install from git with `allow-git=root` in the consumer's .npmrc.
