---
name: Polytope
description: A construction kit and design language for academic sites, paper pages, and research demos, set as a hands-on mathematics exhibition.
colors:
  exhibit-black: "#141414"
  gallery-white: "#FFFFFF"
  gallery-wall: "#EEF0EF"
  hairline-gray: "#D9DAD6"
  caption-gray: "#4A4A47"
  quiet-gray: "#6B6B66"
  panel-chalk: "#F6F7F6"
  panel-gray: "#B9BAB4"
  tomato: "#D9412B"
  tomato-ink: "#B8321F"
  tomato-bright: "#F0654F"
  mustard: "#E9A81C"
  mustard-light: "#F2B83A"
  mustard-soft: "#FBEFD2"
  teal: "#0F6E73"
  teal-light: "#5CC2C7"
  cobalt: "#3A62C4"
  cobalt-light: "#95AEE3"
  after-hours-ground: "#161615"
  after-hours-panel: "#262624"
  after-hours-chalk: "#F2F2EE"
  viz-teal: "#009B93"
  viz-grass: "#4C8C2B"
  viz-sky: "#2E8FD0"
  viz-mustard: "#C28A0A"
  viz-plum: "#9A3E96"
  viz-pink: "#E06C91"
  status-good: "#1E7A3C"
  status-warning: "#F2B71F"
  status-serious: "#E8743B"
  status-critical: "#B3261E"
typography:
  display:
    fontFamily: "Ultra, Ultra Fallback, Rockwell Extra Bold, Rockwell, Georgia, serif"
    fontSize: "clamp(3rem, 1.6rem + 4.4vw, 5.75rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Ultra, Ultra Fallback, Rockwell Extra Bold, Rockwell, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "Ultra, Ultra Fallback, Rockwell Extra Bold, Rockwell, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "Libre Franklin Variable, Libre Franklin, Franklin Gothic Medium, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Libre Franklin Variable, Libre Franklin, Franklin Gothic Medium, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Libre Franklin Variable, Libre Franklin, Franklin Gothic Medium, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "Libre Franklin Variable, Libre Franklin, Franklin Gothic Medium, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Libre Franklin Variable, Libre Franklin, Franklin Gothic Medium, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.3
  mono:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.7
    fontFeature: "liga 0"
rounded:
  none: "0"
  ball: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
  "8": "4rem"
  "9": "6rem"
  "10": "8rem"
components:
  button-primary:
    backgroundColor: "{colors.exhibit-black}"
    textColor: "{colors.gallery-white}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.tomato-ink}"
    textColor: "{colors.gallery-white}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.exhibit-black}"
    rounded: "{rounded.none}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-secondary-hover:
    backgroundColor: "{colors.exhibit-black}"
    textColor: "{colors.gallery-white}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.exhibit-black}"
    rounded: "{rounded.none}"
    padding: "0 0.75rem"
    height: "2.75rem"
  button-ghost-hover:
    backgroundColor: "{colors.gallery-wall}"
  input:
    backgroundColor: "{colors.gallery-white}"
    textColor: "{colors.exhibit-black}"
    rounded: "{rounded.none}"
    padding: "0 0.75rem"
    height: "2.75rem"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.caption-gray}"
    padding: "0 0.75rem"
    height: "2.25rem"
  tab-current:
    backgroundColor: "{colors.exhibit-black}"
    textColor: "{colors.gallery-white}"
  wall-label:
    backgroundColor: "{colors.exhibit-black}"
    textColor: "{colors.gallery-white}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.5rem"
  note:
    backgroundColor: "{colors.mustard}"
    textColor: "{colors.exhibit-black}"
    rounded: "{rounded.none}"
    padding: "1rem 1.5rem"
    width: "36rem"
  exhibit-panel:
    backgroundColor: "{colors.exhibit-black}"
    textColor: "{colors.panel-chalk}"
    rounded: "{rounded.none}"
    padding: "1.5rem"
  code-block:
    backgroundColor: "{colors.exhibit-black}"
    textColor: "{colors.panel-chalk}"
    typography: "{typography.mono}"
    rounded: "{rounded.none}"
    padding: "1rem 1.5rem"
    width: "36rem"
---

# Design System: Polytope

## Overview

**Creative North Star: "A World of Numbers"**

Polytope is set as a hands-on mathematics exhibition, after the 1961 exhibition by Charles and Ray Eames. The page is a white gallery. Content hangs on it in exhibit-black panels, regions are divided by heavy 3px rules, titles are cut in wood type, and every chapter opens with a working model the reader can run. The models are real: a Galton board that drops balls live and settles into a bell curve, a Vietoris-Rips complex whose radius the reader drags.

Color is scarce and each color has one job. Tomato marks the current location and the moving part. Mustard marks notes and always carries black text. Teal marks links and links are always underlined. Everything else is black, white, and gallery gray. Density is calm: a 36rem reading column, wide gutters, generous space between sections, with tables and code held to the same edge as the prose.

Corners are square. The only round things are things that are round in the world: balls, points, radio buttons, status dots. Depth comes from black panels against white and from heavy rules; shadows appear only under layers that float above the page. Dark mode is the exhibition after hours: the ground goes near black and panels sit one step lighter than the ground.

**Key Characteristics:**
- White gallery ground, exhibit-black panels, 3px black rules between regions.
- Ultra wood-type titles in sentence case ending in a tomato full stop.
- Tomato for where you are and what moves; mustard for notes; teal for links.
- Square corners everywhere except balls and points.
- A working model in a black panel with a wall-label caption opens every chapter.
- One signature moment of motion per page; reduced motion shows the end state.

## Colors

A gallery palette: black, white, and gray carry the page, and three strong colors each mark one kind of thing.

### Primary
- **Tomato** (`tomato`): the moving part. Fills the current-location point in the sidebar, the balls in the probability machine, the full stop after titles and the wordmark, the picked radio ball, the switch ball when on, the slider thumb, list markers, and, as tomato ink, the hover fill of primary buttons. It is a fill color. When tomato has to be read as text (field errors, the hovered pager title) use **Tomato Ink** (`tomato-ink`). In dark mode the accent becomes **Tomato Bright** (`tomato-bright`).

### Secondary
- **Mustard** (`mustard`): notes, highlights, text selection, the `mark` element, the machine funnel, the filled triangles of the complex, and the copied state of the copy button. It always carries exhibit-black text in both themes. **Mustard Soft** (`mustard-soft`) is the quieter note fill in light mode. **Mustard Light** (`mustard-light`) is the focus ring inside black panels and the code comment color, so explanations read first.

### Tertiary
- **Teal** (`teal`): links and the focus ring on the light ground. Links are semibold with a 2px underline at 45 percent of the text color; on hover the text turns black and the underline turns tomato. **Teal Light** (`teal-light`) is the link color in dark mode and inside panels, and the code string color.
- **Cobalt** (`cobalt`): data only. It anchors the sequential ramp and the cool half of the diverging ramp. **Cobalt Light** (`cobalt-light`) is the code number color.

### Neutral
- **Exhibit Black** (`exhibit-black`): body text, headings, panels, code blocks, 3px rules, control borders, the current tab, wall labels, primary buttons.
- **Gallery White** (`gallery-white`): the page ground and the chart surface in light mode.
- **Gallery Wall** (`gallery-wall`): sunken surfaces such as inline code, table stripes, ghost hover, info and success notes, disabled controls.
- **Hairline Gray** (`hairline-gray`): 1px rules between table rows and list items, chart grid lines.
- **Caption Gray** (`caption-gray`): captions, metadata, secondary navigation, inactive tabs; also the hairline inside panels.
- **Quiet Gray** (`quiet-gray`): placeholders and the quietest labels, still above 4.5:1 on white.
- **Panel Chalk** (`panel-chalk`) and **Panel Gray** (`panel-gray`): text and muted text inside black panels.
- **After Hours Ground** (`after-hours-ground`), **After Hours Panel** (`after-hours-panel`), **After Hours Chalk** (`after-hours-chalk`): the dark theme ground, panel, and text. The dark panel is lighter than the dark ground so panels still read as objects.

### Data colors
Charts use eight categorical slots in a fixed order: tomato, teal, cobalt, grass, sky, mustard, plum, pink (`viz-*` tokens for light; dark values live in the sidecar). The order is validated for color vision deficiency in both themes: worst adjacent delta E 13.6 in light and in dark, 18.0 and 16.7 for normal vision. Scatter plots and small multiples use only the first three slots. Magnitude uses the cobalt ramp, with steps 3 to 7 for ordinal data. Diverging data runs cobalt to gray to tomato. Status colors (`status-good`, `status-warning`, `status-serious`, `status-critical`) are reserved for status and always appear with a shape and a word.

### Named Rules
**The One Moving Part Rule.** Tomato marks only the current location and the thing that moves. If it does neither, it is not tomato.

**The Black Text on Mustard Rule.** Mustard always carries exhibit-black text, in both themes, including links inside notes.

**The Underlined Link Rule.** Links are teal and always underlined. Color alone never marks a link.

**The Mark and Word Rule.** Status and note kind are carried by a shape and a word: ball for note, triangle for warning, check for success, cross for danger. Color never carries status alone.

## Typography

**Display Font:** Ultra (with Ultra Fallback, which is Georgia Bold scaled to Ultra's metrics, then Rockwell Extra Bold, Rockwell, Georgia, serif)
**Body Font:** Libre Franklin Variable (with Franklin Gothic Medium, Helvetica Neue, Arial, sans-serif)
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace, SFMono-Regular, Menlo, monospace)

**Character:** Ultra is a fat wood-type slab, loud and friendly like exhibition signage; Libre Franklin is a plain American gothic that reads quietly at length. All three faces are self-hosted.

### Hierarchy
- **Display** (Ultra 400, 48px on phones to 92px on wide screens, line height 0.98): page and chapter titles in the mast, sentence case, ending in a tomato full stop. Mast titles size to their longest word with a container query (`100cqi / (chars * 0.76)`) capped at the display size, so the longest word never breaks and the stop stays attached.
- **Headline** (Ultra 400, 32px, line height 1.1): section headings in the reading column.
- **Wordmark** (Ultra 400, 24px): the top bar wordmark, pager titles, app and empty-state titles.
- **Title** (Libre Franklin 700, 24px, line height 1.2): third-level headings. Fourth level is 20px bold.
- **Lede** (Libre Franklin 400, 20px, line height 1.45): the paragraph under a mast title, capped at 36rem.
- **Body** (Libre Franklin 400, 17px, line height 1.6): all running text, in a 36rem column (about 68 characters).
- **UI** (Libre Franklin 400, 15px): tabs, the search field, sidebar links, tables, notes, author lines (`--ply-size-ui`).
- **Label** (Libre Franklin 700, 13px, line height 1.3): wall labels, tags, sidebar group headings, code bar text.
- **Mono** (JetBrains Mono 400, 0.875em, line height 1.7 in blocks, ligatures off): code, keys, and numeric parameters. Tables and numbers use tabular figures.

### Named Rules
**The Wood Type Rule.** Ultra is for titles only, at 24px and up, in sentence case. Everything that gets read is Libre Franklin.

**The Full Stop Rule.** Mast titles and the wordmark end in a tomato full stop that never wraps away from its word.

## Layout

The page is a top bar, a mast, a 3px rule, then a three-column docs grid inside a 90rem container with a fluid gutter of 16px on phones to 72px on wide screens.

- **Top bar:** wordmark at left, nine chapter links from 72rem up, search and theme tools at right, 4.5rem tall, closed by a 3px rule. Below 72rem the chapters move into a details menu.
- **Mast:** one column on phones; from 64rem, title and lede at left and a 35rem exhibit at right. Every chapter landing puts its own working model in that slot as a black panel with a caption below.
- **Docs grid:** reading column only on phones; a 17.5rem sticky chapter sidebar from 56rem; a 15rem sticky on-this-page list from 80rem.
- **Reading column:** 36rem. Notes, code blocks, and text in one column share that edge. Wide blocks opt out explicitly.
- **Rhythm:** a 4px-based scale from 0.25rem to 8rem. Paragraphs are 1rem apart, section headings get 3rem above and 0.75rem below, the mast pads 3rem to 4rem.
- **Phones (below 40rem):** search collapses to an icon button, charts keep a 32rem minimum width and scroll sideways with soft scroll-shadow cues and a hint line, token tables stack.
- **Very narrow (below 25rem):** the Menu button shows only its icon, and the pager stacks below 30rem, so nothing scrolls sideways at 320px.
- **Touch (`pointer: coarse`):** tabs, small buttons, the menu, segmented controls, slider rails, and sidebar and on-this-page links grow to 44px targets.
- **Sidenotes:** in the margin from 90rem, but only when the main column (container `ply-main`) has 52rem for the measure, the gap, and the note.
- **Contrast themes and print:** in forced colors, marks drawn as fills keep their shapes in system colors and picked states use Highlight; on paper the light theme applies, panels print as ink on white, and the site chrome is hidden.

## Elevation & Depth

The system is flat. Depth comes from contrast: a black panel on a white ground reads as an object hung on a wall, and 3px rules separate regions. Nothing at rest has a shadow. A soft shadow appears only under layers that float above the page and dismiss themselves: tooltips, toasts, and citation cards. Inputs on hover thicken their border with a 1px inset ring.

### Shadow Vocabulary
- **Tooltip lift** (`box-shadow: 0 0.5rem 1.25rem rgb(0 0 0 / 0.2)`): chart tooltips.
- **Card lift** (`box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 0.18)`): citation cards that open over prose.
- **Toast lift** (`box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.25)`): toasts at the foot of the viewport.

### Named Rules
**The Wall and Panel Rule.** Depth is a black panel on a white wall. Shadows belong only to layers that float and go away.

## Shapes

Square corners on every panel, button, input, tag, note, code block, and menu (`rounded.none`). Round is reserved for things that are round: balls, points, radio buttons, the switch ball, the slider thumb, status dots, legend keys for points (`rounded.ball`). Borders come in three weights: 1px hairlines between rows, 2px control borders, 3px exhibit rules. Keys get a 3px bottom border like a physical key.

**The Only Round Things Rule.** If it is not a ball or a point, its corners are square.

## Components

### Buttons
Square exhibit labels.
- **Shape:** square (0), 44px tall, 2px border.
- **Primary:** exhibit black with white semibold text, 1.5rem side padding. Inside a black panel it inverts to chalk with black text.
- **Hover / Focus:** hover fills tomato ink with white text (bright tomato with black text in dark mode, through `--ply-color-on-accent`); press nudges down 1px; focus is a 3px teal outline offset 2px (mustard inside panels). Transitions run 120ms ease-out.
- **Secondary:** transparent with a black border; hover fills black.
- **Ghost:** borderless, 0.75rem padding; hover shows the gallery wall gray.
- **Sizes:** small is 36px tall, growing to 44px on touch screens; icon buttons are square.

### Chips
- **Tags:** 13px bold text, 1.5px current-color border, square. Solid tags are black; note tags are mustard with black text.
- **Status:** a shape plus a word. Idle is a ring, running a pulsing tomato ball, done a green check, warning a yellow triangle, error a red cross.
- **Stability:** stable is solid black, experimental is dashed, deprecated is struck through in caption gray.

### Cards / Containers
- **Exhibit panel:** exhibit black, chalk text, 1.5rem padding, square, no shadow. Links inside use the light teal.
- **Exhibit figure:** a panel with a wall-label caption under it, outside the black: 14px caption gray text with a bold black lead phrase, capped at 40rem.
- **Wall label:** a small black tag with white 13px bold text naming an exhibit or marking the current tab.
- **Notes:** mustard fill, black text, a ball mark, 1rem by 1.5rem padding, capped at the 36rem measure. Variants: soft (pale mustard), info and success (gallery wall), danger (black with a tomato cross).

### Inputs / Fields
- **Style:** white field, 2px black border, square, 44px tall. Labels are 14px bold above the field; hints are 14px caption gray.
- **Focus:** 3px teal outline offset 2px (mustard inside panels and code, black on mustard notes); hover adds a 1px inset ring.
- **Error / Disabled:** error turns the border tomato and adds a tomato diamond with tomato-ink text; disabled uses the gallery wall fill and quiet gray text.
- **Choices:** checkboxes are square and fill black with a white check; radios are round and fill with a tomato ball; the switch is a square track with a ball that rolls and turns tomato; the range slider is a 3px rail with a tomato ball and the value printed in mono beside it; segmented controls are wall-label tabs in a bordered row.

### Navigation
- **Top bar tabs:** 15px medium caption gray; hover shows the gallery wall; the current chapter is a black wall-label tab with white semibold text.
- **Sidebar:** caption gray links; the current page is bold black with a tomato point to its left.
- **On this page:** 14px caption gray; the current section turns black and semibold.
- **Pager:** a 3px rule, then previous and next with Ultra titles that turn tomato ink on hover.
- **Mobile:** chapters move into a native details menu with a 3px black border; search becomes icon-only.

### Code Blocks
Black panels capped at the reading measure. A bar with the language in mono and a hairline copy button sits on top; the copy button turns mustard when copied. Comments are mustard light, keywords tomato bright, strings teal light, numbers cobalt light.

### Probability Machine
The signature model: a Galton board in a black panel at 28:15. A mustard funnel, chalk pegs in a triangle, bins with gray walls, and tomato balls. It drops balls live on load and settles into a bell curve; without script, or with reduced motion, it shows the settled curve. A three-row version of the same machine is the loading indicator, its ball falling on the gravity curve.

### Charts
A bold 16px title, a 14px caption gray subtitle, hairline grid, caption gray axes, a 1.5px black baseline, direct labels in semibold black, point legend keys as balls, and a texture fill for print and forced colors.

## Do's and Don'ts

### Do:
- **Do** open every chapter landing with a working model in a black panel, captioned underneath like a wall label.
- **Do** keep text, notes, and code in one column on the same 36rem edge.
- **Do** end mast titles in a tomato full stop and size them to the longest word.
- **Do** use ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) for things that arrive and the gravity curve (`cubic-bezier(0.55, 0, 1, 0.45)`) for things that fall.
- **Do** give each page one signature moment of motion and show the end state under reduced motion.
- **Do** assign chart colors in the fixed slot order and limit scatter plots and small multiples to the first three.
- **Do** check every new color pair with the contrast script in both themes (WCAG AA: 4.5:1 for text, 3:1 for marks, rings, and borders).
- **Do** write plain, specific copy with no dashes as punctuation and no sales words.

### Don't:
- **Don't** use tomato for anything other than the current location or a moving part.
- **Don't** put white or colored text on mustard.
- **Don't** show a link without its underline.
- **Don't** set Ultra below 24px, in all caps, or for running text.
- **Don't** round a corner unless the shape is a ball or a point.
- **Don't** put shadows on panels, buttons, cards, or anything that stays on the page.
- **Don't** let color carry status by itself; pair it with a shape and a word.
- **Don't** cycle chart colors past the eighth slot or reorder them.
