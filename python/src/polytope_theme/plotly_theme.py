"""plotly integration: a layout template that matches the matplotlib style.

Usage::

    from polytope_theme import plotly_theme
    plotly_theme.register(default="light")   # or fig.update_layout(template=plotly_theme.template())
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Sequence

from ._tokens import CATEGORICAL, COLORS, DIVERGING, FONTS, SEQUENTIAL, SURFACE

if TYPE_CHECKING:
    from plotly.graph_objects.layout import Template

__all__ = ["TEMPLATE_NAMES", "register", "template"]

TEMPLATE_NAMES = {"light": "polytope", "dark": "polytope_dark"}

FONT_STACK = f"{FONTS['text']}, Franklin Gothic Medium, Helvetica Neue, Arial, sans-serif"


def _require():
    try:
        import plotly.graph_objects as go
    except ImportError as exc:
        raise ImportError(
            "polytope_theme.plotly_theme needs plotly. Install it with "
            "pip install \"polytope-theme[plotly]\"."
        ) from exc
    return go


def _scale(stops: Sequence[str]) -> list[list]:
    last = len(stops) - 1
    return [[i / last, c] for i, c in enumerate(stops)]


def template(mode: str = "light") -> "Template":
    """Return a plotly Template for ``mode`` ("light" or "dark")."""
    if mode not in TEMPLATE_NAMES:
        raise ValueError(f"mode must be one of {tuple(TEMPLATE_NAMES)!r}, got {mode!r}")
    go = _require()
    c = COLORS[mode]
    surface = SURFACE[mode]
    sequential = _scale(SEQUENTIAL)
    diverging = _scale(DIVERGING)

    axis_common = dict(
        color=c["text_muted"],
        title=dict(font=dict(color=c["text"], size=13)),
        tickfont=dict(color=c["text_muted"], size=12),
        gridcolor=c["rule"],
        gridwidth=1,
        zeroline=False,
        zerolinecolor=c["rule"],
        zerolinewidth=1,
        linecolor=c["text_muted"],
        linewidth=1,
        showline=True,
        mirror=False,
        ticks="outside",
        tickcolor=c["text_muted"],
        ticklen=4,
        automargin=True,
    )

    layout = go.Layout(
        font=dict(family=FONT_STACK, size=13, color=c["text"]),
        title=dict(
            font=dict(family=FONT_STACK, size=17, color=c["text"], weight=700),
            x=0,
            xref="paper",
            xanchor="left",
        ),
        colorway=list(CATEGORICAL[mode]),
        paper_bgcolor=surface,
        plot_bgcolor=surface,
        # Gridlines on y only, like the matplotlib style.
        xaxis=dict(axis_common, showgrid=False),
        yaxis=dict(axis_common, showgrid=True),
        legend=dict(
            bgcolor="rgba(0,0,0,0)",
            borderwidth=0,
            font=dict(size=12, color=c["text"]),
            title=dict(font=dict(color=c["text_muted"])),
        ),
        hoverlabel=dict(
            bgcolor=c["panel"],
            bordercolor=c["panel"],
            font=dict(family=FONT_STACK, color=c["panel_text"], size=12),
        ),
        colorscale=dict(sequential=sequential, sequentialminus=sequential[::-1], diverging=diverging),
        coloraxis=dict(colorbar=dict(outlinewidth=0, ticks="outside", tickcolor=c["text_muted"], ticklen=4)),
        annotationdefaults=dict(font=dict(color=c["text"]), arrowcolor=c["text_muted"]),
        shapedefaults=dict(line=dict(color=c["text"])),
        margin=dict(l=64, r=32, t=64, b=56),
        hovermode="closest",
    )

    colorbar = dict(outlinewidth=0, ticks="outside", tickcolor=c["text_muted"], ticklen=4)
    data = dict(
        scatter=[go.Scatter(line=dict(width=2), marker=dict(size=7, line=dict(width=0)))],
        bar=[go.Bar(marker=dict(line=dict(width=0)))],
        heatmap=[go.Heatmap(colorscale=sequential, colorbar=colorbar)],
        contour=[go.Contour(colorscale=sequential, colorbar=colorbar)],
        table=[
            go.Table(
                header=dict(fill=dict(color=c["surface_sunken"]), line=dict(color=c["rule"]), font=dict(color=c["text"])),
                cells=dict(fill=dict(color=surface), line=dict(color=c["rule"]), font=dict(color=c["text"])),
            )
        ],
    )
    return go.layout.Template(layout=layout, data=data)


def register(default: str | None = None) -> None:
    """Add "polytope" and "polytope_dark" to ``plotly.io.templates``.

    Pass ``default="light"`` or ``default="dark"`` to also make one of them
    the default template.
    """
    _require()
    import plotly.io as pio

    for mode, name in TEMPLATE_NAMES.items():
        pio.templates[name] = template(mode)
    if default is not None:
        if default not in TEMPLATE_NAMES:
            raise ValueError(f"default must be None, 'light' or 'dark', got {default!r}")
        pio.templates.default = TEMPLATE_NAMES[default]
