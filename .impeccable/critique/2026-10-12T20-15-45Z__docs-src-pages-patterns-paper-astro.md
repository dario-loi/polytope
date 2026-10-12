---
target: content pages (paper, post, docs article layout)
total_score: 25
max_score: 36
na_heuristics: 9
p0_count: 0
p1_count: 2
target_identity: "file:docs/src/pages/patterns/paper.astro"
target_fingerprint: "sha256:39a7176798b5c50fdf80980f82dfe1b1ed7342e2b78f3ad9ac91e0750324950d"
target_path: docs/src/pages/patterns/paper.astro
timestamp: 2026-10-12T20-15-45Z
slug: docs-src-pages-patterns-paper-astro
---
Method: dual-agent (A: design review, B: detector and browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Below 80rem nothing shows where you are on the page |
| 2 | Match System / Real World | 3 | Table caption below the table and long; equation (1) not linked |
| 3 | User Control and Freedom | 3 | Citation jumps to references with no way back |
| 4 | Consistency and Standards | 3 | Rail's current section has no tomato mark, unlike the sidebar |
| 5 | Error Prevention | 2 | A margin figure pushes a sidenote into the next section; demo headings leak into the TOC |
| 6 | Recognition Rather Than Recall | 3 | No page map below 80rem |
| 7 | Flexibility and Efficiency | 2 | Phones, 200% zoom, small laptops get no section jump list |
| 8 | Aesthetic and Minimalist Design | 3 | Three unrelated right edges (text, notes, wide blocks) |
| 9 | Error Recovery | n/a | Static reading page, no input or error states |
| 10 | Help and Documentation | 3 | Scroll cues and hints work |
| **Total** | | **25/36** | **Good** |

## Design Specificity Verdict

Authored: Ultra titles, 3px rules, the mustard 2-cell in the margin, print-style theorem blocks, tomato marks. The layout itself is the standard Tufte/Distill frame, and the margin is empty for most of each page. Detector: 0 CLI findings; in-page overlay flagged text-overflow (the sidenote in the margin) and monotonous-spacing on body, both judged false positives. No horizontal overflow, no wide/margin overlaps.

## Priority Issues

- [P1] Sidenote drifts from its anchor when a margin figure precedes it (post, One triangle). Fix: h2 clears margin floats; move Figure 1 to Boundary maps.
- [P1] No on-this-page navigation below 80rem. Fix: On this page disclosure at the top of the article; page sections in the docs In this chapter menu.
- [P2] Table captions scroll off-screen on phones and run about 150 characters at 1440. Fix: cap at the measure and keep in view while scrolling.
- [P2] Header title line count flips with width; the 22ch cap never binds and depends on the loaded font. Fix: em-based cap.
- [P2] Rail fragile: no max-height, demo headings leak in, empty label without JS. Fix: max-height with scroll, skip .ply-post/.ply-paper headings, hide empty lists.

## Persona Red Flags

- Sam: no TOC at 200% zoom; sidenote number read twice (sup plus ::before); no way back from references.
- Casey: no section navigation on a 3700px page; caption clipped in the scrolling table; margin figure fills the first screen of the post.
- Academic reviewer: BibTeX clipped beside an empty margin; references de-emphasized; equation (1) not a link.

## Minor Observations

- Three right edges at 1440 (1008, 1264, 1380); let margin content run to the page edge.
- Wide block after a long note leaves a gap (documented trade-off).
- Rail current item lacks tomato.

## Questions to Consider

- Should the margin hold persistent material (citation cards Tufte-style) rather than stay mostly empty?
- Is the title a wide block or a text block?
- Is the page map a reading feature or a big-screen feature?
