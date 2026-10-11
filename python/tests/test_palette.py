import re

import pytest

import polytope_theme as dl

HEX = re.compile(r"^#[0-9A-F]{6}$")


def test_version():
    assert dl.__version__ == "0.2.0"


def test_categorical_shapes():
    assert len(dl.CATEGORICAL["names"]) == 8
    for mode in dl.MODES:
        assert len(dl.CATEGORICAL[mode]) == 8
        assert all(HEX.match(c) for c in dl.CATEGORICAL[mode])
        assert len(set(dl.CATEGORICAL[mode])) == 8
    assert dl.MAX_SERIES == 8
    assert dl.SCATTER_SLOTS == 3


def test_ramp_shapes():
    assert len(dl.SEQUENTIAL) == 7
    assert len(dl.DIVERGING) == 7
    assert all(HEX.match(c) for c in dl.SEQUENTIAL + dl.DIVERGING)
    # Diverging runs from cobalt through a gray midpoint to tomato.
    assert dl.DIVERGING[0] == dl.SEQUENTIAL[5]
    mid = dl.DIVERGING[len(dl.DIVERGING) // 2]
    r, g, b = (int(mid[i : i + 2], 16) for i in (1, 3, 5))
    assert max(r, g, b) - min(r, g, b) < 12


def test_status_and_surface():
    assert set(dl.STATUS) == {"good", "warning", "serious", "critical"}
    assert set(dl.SURFACE) == set(dl.MODES)
    assert dl.FONTS == {"display": "Ultra", "text": "Libre Franklin", "mono": "JetBrains Mono"}


def test_colors_keys():
    light, dark = dl.colors("light"), dl.colors("dark")
    assert set(light) == set(dark) == set(dl.COLORS["light"])
    for key in ("bg", "text", "text_muted", "rule", "accent", "link", "note"):
        assert key in light
    assert light["bg"] == "#FFFFFF"
    assert light["text"] == "#141414"
    assert light["accent"] == "#D9412B"


def test_colors_returns_copy():
    c = dl.colors()
    c["bg"] = "#000000"
    assert dl.COLORS["light"]["bg"] == "#FFFFFF"


def test_bad_mode():
    with pytest.raises(ValueError):
        dl.colors("sepia")
    with pytest.raises(ValueError):
        dl.categorical("sepia")


def test_categorical_order_and_n():
    assert dl.categorical() == dl.CATEGORICAL["light"]
    assert dl.categorical("dark", 3) == dl.CATEGORICAL["dark"][:3]
    assert dl.categorical(n=0) == []
    assert dl.categorical(n=8) == dl.CATEGORICAL["light"]


def test_categorical_limit():
    with pytest.raises(ValueError, match="Other") as info:
        dl.categorical(n=9)
    assert "small multiples" in str(info.value)
    with pytest.raises(ValueError):
        dl.categorical(n=-1)


def test_import_does_not_pull_plotting_libs():
    import subprocess
    import sys

    code = (
        "import sys, polytope_theme; "
        "bad = [m for m in ('matplotlib', 'plotly', 'gradio', 'streamlit') if m in sys.modules]; "
        "sys.exit(1 if bad else 0)"
    )
    assert subprocess.run([sys.executable, "-c", code]).returncode == 0


def test_style_files_ship():
    from polytope_theme.mpl import style_path

    for mode in dl.MODES:
        path = style_path(mode)
        assert path.is_file()
        text = path.read_text()
        assert dl.SURFACE[mode].lstrip("#") in text
        assert "axes.prop_cycle" in text
