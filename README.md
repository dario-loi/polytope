# Polytope

Polytope is a design system for researchers who publish on the web: a personal academic site, a page for each paper, and the small interactive demos that go with them. It ships as plain CSS, Astro components, and a Python theme, all compiled from one token file, so the figures in a paper match the page that hosts them.

![The Polytope docs site: a wood-type title on the left and a black panel on the right holding a complex of points, edges, and mustard triangles, with a radius slider below](docs/public/img/polytope-getting-started.png)

Documentation and live examples: https://dario-loi.github.io/polytope/

## What it looks like

The visual language borrows from the mathematics exhibition Charles and Ray Eames designed for IBM in 1961. Pages are white walls with black exhibit panels and heavy rules. Titles are set in Ultra, a fat wood-type slab. Everything you read is in Libre Franklin, and code is in JetBrains Mono. Red marks the one thing that moves or the place you are, mustard holds notes, and teal is for links.

Each page gets one working model. The emblem is a Vietoris-Rips complex: random points that join into edges and fill into triangles as you drag a radius. The docs open with it growing from bare points, and the homepage pattern uses it as the header figure. The probability machine, a Galton board that drops real random balls into a bell curve, runs on Principles and doubles as the loading indicator. Both work without JavaScript and show their final state when the reader asks for reduced motion.

![The homepage pattern in the dark theme, with a random complex of points, edges, and filled triangles](docs/public/img/polytope-homepage-dark.png)

## What's included

- About 30 CSS components, from buttons and forms to paper headers, citations, theorem environments, a publication list, demo chrome, and site search over a static Pagefind index. Light and dark themes switch on their own.
- 35 Astro components that print the same markup.
- The two working models as custom elements, `<ply-machine>` and `<ply-complex>`, and the Atlas, `<ply-atlas>`: a globe of the places in a CV that turns to each entry as you read.
- A chart palette of eight colors, checked for color vision deficiency in both themes, with matplotlib, plotly, Gradio, and Streamlit themes that use it.
- Exports for Tailwind v4, Sass, LaTeX (xcolor and a pgfplots cycle list), TypeScript, Figma token plugins, and a code theme for Shiki and VS Code.
- The documentation site itself, with four full example pages: a homepage, a paper page, a demo, and a CV.

## Install

```sh
npm install @dario-loi/polytope
```

Then import the stylesheet once in your layout:

```js
import "@dario-loi/polytope/css";
```

A page without a build step can link the hosted files:

```html
<link rel="stylesheet" href="https://dario-loi.github.io/polytope/kit/polytope.css">
<script type="module" src="https://dario-loi.github.io/polytope/kit/js/all.js"></script>
```

The Python theme is on PyPI:

```sh
pip install "polytope-theme[matplotlib,plotly]"
```

## Using Polytope with Impeccable

[Impeccable](https://github.com/pbakaus/impeccable) reads a project's visual system from `DESIGN.md` and `.impeccable/design.json`. Polytope ships both, and one command copies them into a site:

```sh
npx @dario-loi/polytope            # copies DESIGN.md and .impeccable/design.json into the site
npx @dario-loi/polytope --check    # fails if the copies are older than the installed Polytope
```

In a project that has Polytope installed, npx runs that copy. The command won't replace another system's `DESIGN.md` unless you pass `--force`.

A site without npm (a static site built by Python, for example) can fetch the same files pinned to a release and link the hosted stylesheet in its template:

```sh
curl -fsSLo DESIGN.md https://raw.githubusercontent.com/dario-loi/polytope/v0.4.1/DESIGN.md
mkdir -p .impeccable && curl -fsSLo .impeccable/design.json https://raw.githubusercontent.com/dario-loi/polytope/v0.4.1/.impeccable/design.json
```

Either way, new pages are then built inside Polytope and the design checker flags anything off the system. Run `/impeccable init` once so the site gets its own `PRODUCT.md`, and copy the files again whenever you upgrade Polytope.

## A first page

With Astro:

```astro
---
import "@dario-loi/polytope/css";
import { TopBar, Mast, Machine, Note } from "@dario-loi/polytope/astro";
---
<TopBar brand="John Doe" links={[{ label: "Research", href: "/" }]} />
<Mast title="Research" lede="Graph learning and the shapes data comes in.">
  <Machine slot="exhibit" interactive />
</Mast>
<main class="ply-container ply-prose">
  <Note>Results are averaged over five seeds.</Note>
</main>
```

With matplotlib, so the figures in the paper match the page:

```python
import matplotlib.pyplot as plt
import polytope_theme as ply

ply.use("light")
fig, ax = plt.subplots()
ax.plot(epochs, accuracy, label="GCN")
fig.savefig("figure.pdf")
```

## Working on Polytope

```sh
git clone https://github.com/dario-loi/polytope
cd polytope
npm install              # installs the build dependencies
npm run build            # rebuilds dist/ and the generated Python files; commit the result
npm run docs:dev         # rebuilds the kit and serves the docs locally
npm run check:contrast   # fails if any text pair drops below WCAG AA
npm run check:prose      # fails on any en or em dash in the sources or the built docs
cd python && pytest      # tests for the Python theme
```

Design decisions live in `tokens/tokens.json` and styles in `css/src/`. The build writes everything else, including `dist/` and the generated Python files, so edit the sources, run `npm run build`, and commit what it writes. `dist/` is committed on purpose: installs from GitHub then run no install scripts, and CI fails if it drifts from a fresh build. `DESIGN.md` records the system as built and the rules behind it.

| Path | What it holds |
|---|---|
| `tokens/tokens.json` | Every design decision, in the W3C Design Tokens format |
| `css/src/` | The CSS core, in cascade layers, with the `ply-` prefix |
| `css/js/` | The working models, the Atlas and its map data, site search, and small scripts for copy buttons, scroll boxes, the theme toggle, and form controls |
| `astro/` | Astro components |
| `python/` | The `polytope-theme` package |
| `scripts/` | The build and the contrast and prose checks, using only Node's standard library |
| `docs/` | The documentation site |

## Status

This is version 0.4. The core components are marked stable in the docs; the working models, the Atlas, research components, and demo chrome are experimental and may change before 1.0. The changelog on the docs site lists what changes between releases.

## Credits and license

Polytope is made by Dario Loi at Northeastern University and released under the Apache License 2.0. See `LICENSE` and `NOTICE`.

The bundled fonts keep their own licenses, shipped next to the font files: Ultra by Astigmatic under the Apache License 2.0, and Libre Franklin and JetBrains Mono under the SIL Open Font License 1.1. The definition of a design system that the docs follow comes from the [SBB design system](https://digital.sbb.ch/en/design-system/getting-started/intro/).
