"""Polytope for Python: palette data and chart/app themes.

The palette data is generated from tokens/tokens.json by scripts/build.mjs and
lives in ``_tokens.py``. This module re-exports it and adds small accessors.
Library integrations live in submodules so that importing this package never
imports matplotlib, plotly, gradio or streamlit:

- ``polytope_theme.mpl``             matplotlib style, colormaps, direct labels
- ``polytope_theme.plotly_theme``    plotly template
- ``polytope_theme.gradio_theme``    gradio theme
- ``polytope_theme.streamlit_theme`` streamlit config.toml

Chart rules encoded here:

- Categorical colors are assigned in fixed order and never cycled. At most 8
  series; fold the rest into "Other" or split into small multiples.
- Scatter plots and small multiples use only the first 3 slots.
- Sequential data uses the cobalt ramp (SEQUENTIAL).
- Diverging data runs cobalt -> gray midpoint -> tomato (DIVERGING).
- STATUS colors are reserved for good/warning/serious/critical and must be
  paired with a label or marker, never used as the only signal.
"""

from __future__ import annotations

from ._tokens import CATEGORICAL, COLORS, DIVERGING, FONTS, SEQUENTIAL, STATUS, SURFACE

__version__ = "0.7.1"

__all__ = [
    "CATEGORICAL",
    "COLORS",
    "DIVERGING",
    "FONTS",
    "MAX_SERIES",
    "MODES",
    "SCATTER_SLOTS",
    "SEQUENTIAL",
    "STATUS",
    "SURFACE",
    "__version__",
    "categorical",
    "colors",
    "use",
]

MODES = ("light", "dark")

# Number of categorical slots. Charts with more series must be restructured.
MAX_SERIES = len(CATEGORICAL["names"])

# Scatter plots and small multiples use only the first SCATTER_SLOTS colors.
SCATTER_SLOTS = 3


def _check_mode(mode: str) -> str:
    if mode not in MODES:
        raise ValueError(f"mode must be one of {MODES!r}, got {mode!r}")
    return mode


def colors(mode: str = "light") -> dict[str, str]:
    """Return the semantic UI colors for ``mode`` as a new dict.

    Keys match the token names, for example ``bg``, ``text``, ``text_muted``,
    ``rule``, ``accent``, ``link`` and ``note``. Chart backgrounds use
    ``SURFACE[mode]``, which differs from ``bg`` in dark mode.
    """
    return dict(COLORS[_check_mode(mode)])


def categorical(mode: str = "light", n: int | None = None) -> list[str]:
    """Return the first ``n`` categorical colors in their fixed order.

    With ``n=None`` all 8 colors are returned. Colors are never cycled, so
    asking for more than 8 raises ValueError.
    """
    palette = CATEGORICAL[_check_mode(mode)]
    if n is None:
        return list(palette)
    if not isinstance(n, int) or isinstance(n, bool) or n < 0:
        raise ValueError(f"n must be a non-negative integer or None, got {n!r}")
    if n > MAX_SERIES:
        raise ValueError(
            f"categorical() supports at most {MAX_SERIES} series, got {n}. "
            "Colors are not cycled. Fold the extra series into an \"Other\" "
            "group, or split the chart into small multiples."
        )
    return list(palette[:n])


def use(mode: str = "light") -> None:
    """Apply the matplotlib style for ``mode`` and register the colormaps.

    matplotlib is imported only when this function is called.
    """
    _check_mode(mode)
    try:
        import matplotlib  # noqa: F401
    except ImportError as exc:
        raise ImportError(
            "polytope_theme.use() needs matplotlib. Install it with "
            "pip install \"polytope-theme[matplotlib]\"."
        ) from exc
    from . import mpl

    mpl.use(mode)
