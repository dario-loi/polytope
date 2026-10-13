---
target: impeccable sweep of the site (Polytope improvements)
total_score: 25
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 2
target_identity: "url:https://dario-loi.github.io/"
timestamp: 2026-10-13T04-19-31Z
slug: dario-loi-github-io
closed: true
---
Method: dual-agent (A: sweep-design / B: sweep-detect), plus technical audit (C: sweep-audit).
Target: the site's production build at localhost:4322 (Polytope 0.6.3), mirroring https://dario-loi.github.io/. 13 pages, light and dark, 320 to 1920.

## Design health (Nielsen)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | Current tab, Atlas ball and copy feedback clear; nothing says the Complex can be dragged |
| 2 | Match real world | 3 | Jargon in the hero caption; "Previous" in the pager leads to the newer paper |
| 3 | User control | 3 | Author fold, CV filter, globe reset work; chapter menu cannot be dismissed |
| 4 | Consistency | 2 | Hero "Publications" goes to an anchor, the tab to a page; list vs cards for the same papers; Abstract h2 24px vs Cite h2 32px |
| 5 | Error prevention | 3 | CV buttons never point at a missing file; email link falls back without JS |
| 6 | Recognition over recall | 3 | Index cards hide PDF and BibTeX; privacy page says "use the email link in the footer" |
| 7 | Flexibility | 2 | No search, no direct actions on index cards |
| 8 | Minimalist design | 3 | Restrained; heavy pager; profile buttons repeat the footer |
| 9 | Error recovery | 3 | Clear 404 with two ways on |
| 10 | Help | n/a | Portfolio with no task that needs docs |
| Total | | 25/36 | Acceptable (69%) |

## Audit health
| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | No A or AA axe violations in 33 runs; menu not dismissable, 404 has no heading, duplicate landmark name |
| 2 | Performance | 3 | LCP 1.53s or less throttled; CLS 0.247 on TDL page; LCP images lazy |
| 3 | Theming | 3 | Dark mode correct; reduced motion plus theme change paints the Atlas tomato; 3 print gaps |
| 4 | Responsive | 4 | No overflow 320-1920, 200% text OK, touch works |
| 5 | Implementation integrity | 3 | Tokens used, no !important; some overrides of Polytope internals; one false privacy claim |
| Total | | 16/20 | Good |

## Design specificity verdict
Strongly authored where Polytope has a component (name-seeded Complex, Atlas, PubList, PaperHeader); interchangeable where the site filled gaps itself (list-page card grids, empty and 404 states, generic copy).
Deterministic scan: site src clean; Polytope astro/ and docs one hit, border-accent-on-rounded at docs/src/pages/foundations/motion.astro:37, false positive. Overlay clean on 6 pages light and 3 dark, with a positive control. Extra: 2px overflow in .ply-segmented on /cv/ at 375px (css/src/components/form.css:54).

## What's working
1. Complex seeded from the owner's name, captioned with his research, keyboard reachable.
2. Paper pages: 0.6.3 title split; owner bold everywhere; 66-author fold keeps him visible.
3. Atlas: synced with scroll, filter dims instead of deleting, dark, phone, touch all work.

## Priority issues
1. [P1] [Polytope] Reduced motion plus a theme change paints the whole Atlas tomato until reload. css/js/atlas.js:284-292 reads colors through a probe mid-transition (css/src/reset.css:16-20). Fix: data-ply-motion="keep" on the probe, or finish transitions before reading (topbar.js:11). transition: none !important would lose to the reset layer's !important. Command: harden.
2. [P1] [Site] No CV PDF anywhere; /cv/ offers only Email. Fix: ship the PDF; meanwhile a Save as PDF action. Command: onboard.
3. [P2] [Polytope] Pager sets full paper titles in 24px Ultra; 7 lines on /publications/implicit-sheaf-operators/ (nav.css:83, Pager.astro:6-7). Fix: cut at the colon as PaperHeader does, long labels in Franklin bold balanced, custom Newer/Older words; site passes shortTitle. Command: layout.
4. [P2] [Polytope] Mast keeps an empty 35rem exhibit column from 64rem; "Publications." shrinks to about 33px at 1024 (layout.css:12-14, Mast.astro:17). Fix: one column without an exhibit, or give list landings a model and keep the DESIGN.md rule. Command: layout.
5. [P2] [Polytope] No index-page layer: site wrote EntryCard, CardGrid, IndexMast, SectionHead, client-side author fold (causes CLS 0.247) and BibTeX hanging indents; fixed 3-column grid leaves holes; lead card breaks Test-/Time; raw color primitives on labels. Fix: fold prop, BibTeX wrap mode, Card and CardGrid, label-on-figure token, export woodTitle. Command: extract.

## Persona red flags
- Academic: index cards lack PDF/Code/BibTeX; TDL contribution buried; hero says only "working on machine learning".
- Recruiter: no PDF; CV leads with dates and a wide globe; conferences mixed with jobs; 7-author header takes four rows on a phone.
- Student: blog empty and not in nav; hero caption names Vietoris-Rips and sheaf networks without explanation or a drag hint.

## Minor observations
- [Polytope] Chapter menu ignores Escape, outside click, focus leaving.
- [Polytope] Paper/post headers need width: 100% plus a docs note (container-type inline-size).
- [Polytope] Empty.astro title is a p (404 has no heading); dashed ring reads as a spinner.
- [Polytope] PubList always outputs a labelled section (duplicate landmark name).
- [Polytope] Print: BibTeX leaves a blank page before it; links print without URLs.
- [Polytope] ThemeToggle persists to localStorage undocumented; site privacy copy false.
- [Polytope] .ply-segmented 2px overflow; PaperHeader first link always primary; Abstract h2 24px vs h2 32px; wrapped ghost button inset; Atlas zooms to a flat mustard field.
- [Site] LCP images lazy (eager saves about 450ms); BibTeX splits the cite key; Polytope cover white in dark mode; Preprint badge duplicates venue; footer prints; hero Publications goes to an anchor.

## Questions to consider
1. What is the working model for a list page, or do list pages get none?
2. Is the site's 300 lines of cards, grids, folding and BibTeX wrapping site code, or Polytope's missing index layer?
3. Should the CV lead with where and when, or with what he did?

## Audit addendum (arrived after the report)
- [Polytope] Code blocks that do not scroll stay tab stops: Shiki tabindex="0" on every pre (Code.astro:87); scroll.js:9 does not manage .ply-code pre.
- [Polytope] Touch: wordmark (146x24) and PubList title links (24px) do not grow under pointer: coarse (modes.css:37-47). Site repeats a coarse min-height 2.75rem rule three times; a target-size utility would replace them.
- [Polytope] Bytes: 32% of the CSS bundle is for blocks no page renders (per-component dist/css/* exists but is undocumented as the lean path); JetBrains Mono (40.7KB) loads on the home page only for the slider output (form.css:45).
- [Polytope] Systemic: the reduced-motion reset (0.01ms transitions, reset.css:16-20) breaks synchronous style reads; topbar.js works around it, atlas.js does not. Document it and share a settle helper.
- [Polytope] Missing hooks the site works around: private --_chars on AtlasStop titles (cv.astro:20); hiding .ply-atlas__tally and __hint (cv.astro:48); redefining --ply-size-display (IndexMast.astro:13); re-implementing the paper title sizing (EntryHeader.astro:15).
- [Site] theme-color fixed to #141414 in both themes (Base.astro:97); footer prints (Base.astro:107).
