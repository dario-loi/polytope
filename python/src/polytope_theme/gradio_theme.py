"""gradio integration: a theme with square corners and exhibit-black buttons.

Usage (gradio 6 passes the theme to ``launch``; gradio 4 and 5 take it in
``gr.Blocks(theme=...)``)::

    import gradio as gr
    from polytope_theme.gradio_theme import theme

    with gr.Blocks() as demo:
        ...
    demo.launch(theme=theme())
"""

from __future__ import annotations

import inspect
from typing import Any

from ._tokens import CATEGORICAL, COLORS, FONTS

__all__ = ["theme"]

_MODES = ("light", "dark", "auto")
_INK = "#141414"
_WHITE = "#FFFFFF"


def _require():
    try:
        import gradio as gr
    except ImportError as exc:
        raise ImportError(
            "polytope_theme.gradio_theme needs gradio. Install it with "
            "pip install \"polytope-theme[gradio]\"."
        ) from exc
    return gr


def _mix(a: str, b: str, t: float) -> str:
    """Blend hex color ``a`` toward ``b`` by fraction ``t``."""
    ca = [int(a[i : i + 2], 16) for i in (1, 3, 5)]
    cb = [int(b[i : i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02X}" for x, y in zip(ca, cb))


def _ramp(base: str) -> list[str]:
    """11-step c50..c950 scale around ``base`` (c500), tinted toward white and ink."""
    lighter = [_mix(base, _WHITE, t) for t in (0.92, 0.84, 0.66, 0.46, 0.24)]
    darker = [_mix(base, _INK, t) for t in (0.16, 0.32, 0.48, 0.62, 0.74)]
    return lighter + [base] + darker


# Warm gray scale taken straight from the token values.
_NEUTRAL = [
    COLORS["light"]["panel_text"],  # c50  #F6F7F6
    COLORS["light"]["surface_sunken"],  # c100 #EEF0EF
    COLORS["light"]["rule"],  # c200 #D9DAD6
    COLORS["light"]["panel_muted"],  # c300 #B9BAB4
    COLORS["dark"]["text_subtle"],  # c400 #8F8F89
    COLORS["light"]["text_subtle"],  # c500 #6B6B66
    COLORS["light"]["text_muted"],  # c600 #4A4A47
    COLORS["dark"]["rule"],  # c700 #3A3A37
    COLORS["dark"]["panel"],  # c800 #262624
    COLORS["dark"]["surface_sunken"],  # c900 #1C1C1A
    COLORS["light"]["text"],  # c950 #141414
]


def _variables(c: dict[str, str]) -> dict[str, str]:
    """Theme variables for one mode, mirroring css/src/components/button.css and form.css."""
    return {
        "body_background_fill": c["bg"],
        "body_text_color": c["text"],
        "body_text_color_subdued": c["text_muted"],
        "background_fill_primary": c["bg"],
        "background_fill_secondary": c["surface_sunken"],
        "border_color_primary": c["rule"],
        "border_color_accent": c["accent"],
        "border_color_accent_subdued": c["rule"],
        "color_accent": c["accent"],
        "color_accent_soft": c["note_soft"],
        "link_text_color": c["link"],
        "link_text_color_active": c["link"],
        "link_text_color_hover": c["link_hover"],
        "link_text_color_visited": c["link"],
        "code_background_fill": c["surface_sunken"],
        "panel_background_fill": c["surface_sunken"],
        "block_background_fill": c["bg"],
        "block_border_color": c["rule"],
        "block_label_background_fill": c["bg"],
        "block_label_text_color": c["text_muted"],
        "block_title_text_color": c["text"],
        "input_background_fill": c["bg"],
        "input_background_fill_focus": c["bg"],
        "input_border_color": c["rule_strong"],
        "input_border_color_focus": c["focus"],
        "checkbox_background_color_selected": c["text"],
        "checkbox_border_color_selected": c["text"],
        "slider_color": c["text"],
        "loader_color": c["accent"],
        "table_even_background_fill": c["bg"],
        "table_odd_background_fill": c["surface_sunken"],
        # Primary: exhibit black, tomato on hover, white label on hover.
        "button_primary_background_fill": c["text"],
        "button_primary_background_fill_hover": c["accent"],
        "button_primary_border_color": c["text"],
        "button_primary_border_color_hover": c["accent"],
        "button_primary_text_color": c["bg"],
        "button_primary_text_color_hover": _WHITE,
        # Secondary: outlined, fills with ink on hover.
        "button_secondary_background_fill": "transparent",
        "button_secondary_background_fill_hover": c["text"],
        "button_secondary_border_color": c["text"],
        "button_secondary_border_color_hover": c["text"],
        "button_secondary_text_color": c["text"],
        "button_secondary_text_color_hover": c["bg"],
    }


# Mode-independent variables: no shadows, square corners, semibold labels.
_FLAT = {
    "shadow_drop": "none",
    "shadow_drop_lg": "none",
    "shadow_spread": "0px",
    "block_shadow": "none",
    "block_label_shadow": "none",
    "input_shadow": "none",
    "input_shadow_focus": "none",
    "checkbox_shadow": "none",
    "button_primary_shadow": "none",
    "button_primary_shadow_hover": "none",
    "button_primary_shadow_active": "none",
    "button_secondary_shadow": "none",
    "button_secondary_shadow_hover": "none",
    "button_secondary_shadow_active": "none",
    "block_title_text_weight": "600",
    "button_large_text_weight": "600",
    "button_medium_text_weight": "600",
    "button_small_text_weight": "600",
}


def theme(mode: str = "light") -> Any:
    """Return a ``gr.themes.Base`` configured for the design system.

    ``mode`` picks which token set fills gradio's light and dark variables:

    - "light": light tokens for both, so the app stays light.
    - "dark":  dark tokens for both, so the app stays dark.
    - "auto":  light tokens for light mode and dark tokens for dark mode,
      following the browser or the ``?__theme=dark`` URL parameter.

    Fonts load from Google Fonts. Ultra is reserved for display titles and is
    not applied by the theme.
    """
    if mode not in _MODES:
        raise ValueError(f"mode must be one of {_MODES!r}, got {mode!r}")
    gr = _require()
    themes = gr.themes

    light = COLORS["dark" if mode == "dark" else "light"]
    dark = COLORS["light" if mode == "light" else "dark"]

    base = themes.Base(
        primary_hue=themes.Color(*_ramp(CATEGORICAL["light"][0]), name="dl_tomato"),
        secondary_hue=themes.Color(*_ramp(CATEGORICAL["light"][1]), name="dl_teal"),
        neutral_hue=themes.Color(*_NEUTRAL, name="dl_gray"),
        radius_size=themes.sizes.radius_none,
        font=[themes.GoogleFont(FONTS["text"], weights=(400, 600, 700)), "Franklin Gothic Medium", "Helvetica Neue", "Arial", "sans-serif"],
        font_mono=[themes.GoogleFont(FONTS["mono"], weights=(400, 700)), "ui-monospace", "Menlo", "monospace"],
    )

    values: dict[str, str] = dict(_FLAT)
    for key, value in _variables(light).items():
        values[key] = value
    for key, value in _variables(dark).items():
        values[f"{key}_dark"] = value

    # Variable names shift between gradio releases; drop any this version lacks.
    accepted = inspect.signature(base.set).parameters
    return base.set(**{k: v for k, v in values.items() if k in accepted})
