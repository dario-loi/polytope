"""Render the example figures shown in the docs.

    python examples/make_examples.py

Writes example-light.png and example-dark.png next to this file. The data is
synthetic: seeded curves and bars that only look like a training run.

If the repo's built fonts (dist/fonts/*.woff2, from `node scripts/build.mjs`)
and fontTools with brotli are available, Libre Franklin and Ultra are converted
to TTF in a temporary folder so matplotlib can use them. Otherwise matplotlib
falls back along the style's font list.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib import font_manager  # noqa: E402

import polytope_theme as dl  # noqa: E402
from polytope_theme.mpl import label_lines  # noqa: E402

HERE = Path(__file__).resolve().parent
FONT_DIR = HERE.parents[1] / "dist" / "fonts"

MODELS = ["Simplicial", "GCN", "MLP"]
GRAPHS = ["Graph A", "Graph B", "Graph C", "Graph D"]


def register_repo_fonts() -> set[str]:
    """Add Libre Franklin (400, 700) and Ultra to matplotlib if possible."""
    try:
        from fontTools.ttLib import TTFont
        from fontTools.varLib import instancer
        import brotli  # noqa: F401  (needed to read woff2)
    except ImportError:
        return set()

    out = Path(tempfile.mkdtemp(prefix="ply-fonts-"))
    added = set()
    jobs = [
        ("libre-franklin-latin-wght.woff2", 400, "Regular"),
        ("libre-franklin-latin-wght.woff2", 700, "Bold"),
        ("ultra-latin-400.woff2", None, "Regular"),
    ]
    for src, weight, style in jobs:
        path = FONT_DIR / src
        if not path.is_file():
            continue
        font = TTFont(path)
        font.flavor = None
        if weight is not None:
            # The variable font's default instance is named "Thin"; pin the
            # weight and rename the static instance so matplotlib finds it.
            font = instancer.instantiateVariableFont(font, {"wght": weight})
            font["OS/2"].usWeightClass = weight
            family = dl.FONTS["text"]
            for rec in font["name"].names:
                if rec.nameID in (1, 16):
                    rec.string = family
                elif rec.nameID in (2, 17):
                    rec.string = style
                elif rec.nameID == 4:
                    rec.string = f"{family} {style}"
                elif rec.nameID == 6:
                    rec.string = f"{family.replace(' ', '')}-{style}"
        target = out / f"{src.split('-latin')[0]}-{style}.ttf"
        font.save(target)
        font_manager.fontManager.addfont(str(target))
        added.add(font_manager.FontProperties(fname=str(target)).get_name())
    return added


def synthetic_data(seed: int = 7):
    rng = np.random.default_rng(seed)
    epochs = np.arange(0, 201, 4)
    finals = {"Simplicial": 86.0, "GCN": 80.5, "MLP": 71.0}
    rates = {"Simplicial": 28.0, "GCN": 22.0, "MLP": 35.0}
    curves = {}
    for model in MODELS:
        clean = finals[model] - (finals[model] - 42.0) * np.exp(-epochs / rates[model])
        noise = rng.normal(0.0, 0.6, epochs.size)
        curves[model] = clean + np.convolve(noise, np.ones(3) / 3, mode="same")
    base = np.array([0.42, 0.65, 1.30, 2.10])
    cost = {"Simplicial": 1.55, "GCN": 1.0, "MLP": 0.35}
    times = {m: base * cost[m] * rng.uniform(0.94, 1.06, base.size) for m in MODELS}
    return epochs, curves, times


def render(mode: str, display_font: str | None) -> Path:
    dl.use(mode)
    colors = dl.categorical(mode, len(MODELS))
    surface = dl.SURFACE[mode]
    epochs, curves, times = synthetic_data()

    fig, (ax_line, ax_bar) = plt.subplots(
        1, 2, figsize=(10, 4.4), dpi=200, layout="constrained", gridspec_kw={"width_ratios": [1.25, 1]}
    )

    # Line chart: 2pt lines, ringed end dots, direct labels in text color.
    for model, color in zip(MODELS, colors):
        ax_line.plot(epochs, curves[model], color=color, label=model, solid_capstyle="round")
        ax_line.plot(
            epochs[-1], curves[model][-1], "o", color=color, markersize=9,
            markeredgecolor=surface, markeredgewidth=2, label="_end", clip_on=False, zorder=3,
        )
    ax_line.set_xlim(0, 200)
    ax_line.set_ylim(40, 90)
    ax_line.set_xlabel("Epoch")
    ax_line.set_ylabel("Test accuracy (%)")
    ax_line.set_title("Accuracy during training")
    label_lines(ax_line, offset=9)

    # Grouped bars: one color per model, same order as the lines.
    n = len(MODELS)
    width = 0.8 / n
    x = np.arange(len(GRAPHS))
    for i, (model, color) in enumerate(zip(MODELS, colors)):
        ax_bar.bar(
            x + (i - (n - 1) / 2) * width, times[model], width=width * 0.9,
            color=color, label=model,
        )
    ax_bar.set_xticks(x, GRAPHS)
    ax_bar.tick_params(axis="x", length=0)
    ax_bar.set_ylabel("Seconds per epoch")
    ax_bar.set_title("Training time")

    handles, labels = ax_line.get_legend_handles_labels()
    fig.legend(handles, labels, loc="outside upper right", ncols=n, handlelength=1.6, columnspacing=1.6)
    title_kw = {"fontsize": 18, "ha": "left", "x": 0.012}
    if display_font:
        title_kw.update(fontfamily=display_font, fontweight="normal")
    else:
        title_kw.update(fontweight="bold")
    fig.suptitle("Synthetic example", **title_kw)

    target = HERE / f"example-{mode}.png"
    fig.savefig(target)
    plt.close(fig)
    return target


def main() -> None:
    fonts = register_repo_fonts()
    display = dl.FONTS["display"] if dl.FONTS["display"] in fonts else None
    for mode in dl.MODES:
        print(f"wrote {render(mode, display).relative_to(HERE.parent)}")
    if not fonts:
        print("note: repo fonts not found or fontTools/brotli missing; used fallback fonts")


if __name__ == "__main__":
    main()
