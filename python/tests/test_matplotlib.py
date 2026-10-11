import pytest

matplotlib = pytest.importorskip("matplotlib")
matplotlib.use("Agg")

import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.colors import to_hex  # noqa: E402

import polytope_theme as dl  # noqa: E402
from polytope_theme import mpl  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_rc():
    with matplotlib.rc_context():
        yield
    plt.close("all")


@pytest.mark.parametrize("mode", dl.MODES)
def test_use_sets_prop_cycle(mode):
    dl.use(mode)
    cycle = [to_hex(c, keep_alpha=False).upper() for c in matplotlib.rcParams["axes.prop_cycle"].by_key()["color"]]
    assert cycle == dl.CATEGORICAL[mode]
    assert to_hex(matplotlib.rcParams["axes.facecolor"]).upper() == dl.SURFACE[mode]
    assert to_hex(matplotlib.rcParams["text.color"]).upper() == dl.COLORS[mode]["text"]
    assert matplotlib.rcParams["image.cmap"] == mpl.SEQUENTIAL_NAME


def test_cmaps_registered():
    for name in ("ply-sequential", "ply-diverging", "ply-sequential_r", "ply-diverging_r"):
        assert name in matplotlib.colormaps
    seq = matplotlib.colormaps["ply-sequential"]
    div = matplotlib.colormaps["ply-diverging"]
    assert to_hex(seq(0.0)).upper() == dl.SEQUENTIAL[0]
    assert to_hex(seq(1.0)).upper() == dl.SEQUENTIAL[-1]
    assert to_hex(div(0.0)).upper() == dl.DIVERGING[0]
    assert to_hex(div(1.0)).upper() == dl.DIVERGING[-1]
    assert to_hex(div(0.5)).upper() == dl.DIVERGING[3]


def test_cmap_builders():
    assert mpl.sequential_cmap().name == "ply-sequential"
    assert mpl.diverging_cmap(n=7).N == 7
    mpl.register_cmaps()  # idempotent


def _style_has_bare_hash_colors():
    import re

    text = mpl.style_path("light").read_text()
    return re.search(r"^[\w.]+:\s*#[0-9A-Fa-f]{6}", text, flags=re.M) is not None


def test_rc_params_reads_hex_colors():
    rc = mpl.rc_params("dark")
    assert rc["figure.facecolor"] == dl.SURFACE["dark"]
    assert rc["grid.color"] == dl.COLORS["dark"]["rule"]
    assert rc["axes.spines.top"] == "False"
    with matplotlib.rc_context(rc):
        assert to_hex(matplotlib.rcParams["text.color"]).upper() == dl.COLORS["dark"]["text"]


@pytest.mark.xfail(
    _style_has_bare_hash_colors(),
    reason="scripts/build.mjs writes unquoted #RRGGBB values, which matplotlib's rc parser reads as comments",
    strict=True,
)
def test_style_path_usable_directly():
    import warnings

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        plt.style.use(str(mpl.style_path("dark")))
    assert to_hex(matplotlib.rcParams["figure.facecolor"]).upper() == dl.SURFACE["dark"]


def test_label_lines():
    dl.use("light")
    fig, ax = plt.subplots()
    for i, name in enumerate(["alpha", "beta", "gamma"]):
        ax.plot([0, 1, 2], [i, i + 0.01, i + 0.02], label=name)
    ax.plot([0, 2], [5, 5], label="_hidden")
    ax.legend()
    anns = mpl.label_lines(ax, remove_legend=True)
    assert [a.get_text() for a in anns] == ["alpha", "beta", "gamma"]
    text_color = dl.COLORS["light"]["text"]
    assert all(to_hex(a.get_color()).upper() == text_color for a in anns)
    assert all(a.xy[0] == 2.0 for a in anns)
    assert ax.get_legend() is None
    fig.canvas.draw()


def test_label_lines_spreads_overlaps():
    dl.use("light")
    fig, ax = plt.subplots()
    ax.plot([0, 1], [0, 1.0], label="a")
    ax.plot([0, 1], [0, 1.001], label="b")
    ax.set_ylim(0, 2)
    a, b = mpl.label_lines(ax)
    assert abs(a.xyann[1] - b.xyann[1]) >= 10
    assert a.arrow_patch is not None and b.arrow_patch is not None


def test_label_lines_keeps_legend_by_default():
    dl.use("light")
    fig, ax = plt.subplots()
    ax.plot([0, 1], [0, 1], label="a")
    ax.plot([0, 1], [1, 0], label="b")
    ax.legend()
    anns = mpl.label_lines(ax)
    assert ax.get_legend() is not None
    assert all(a.arrow_patch is None for a in anns)


def test_label_lines_skips_nan_tail():
    dl.use("light")
    fig, ax = plt.subplots()
    ax.plot([0, 1, 2], [1.0, 2.0, float("nan")], label="a")
    (ann,) = mpl.label_lines(ax)
    assert ann.xy == (1.0, 2.0)
