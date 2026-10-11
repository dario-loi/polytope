"""matplotlib integration: style files, colormaps and direct line labels.

The module is named ``mpl`` so that it does not shadow ``matplotlib`` itself.
Importing it registers the colormaps ``ply-sequential`` and ``ply-diverging``
(plus their ``_r`` reversals) when matplotlib is installed. ``style_path()``
works without matplotlib.
"""

from __future__ import annotations

import math
import re
from pathlib import Path
from typing import TYPE_CHECKING, Any, Iterable, Sequence

from ._tokens import DIVERGING, SEQUENTIAL

try:
    import matplotlib as _matplotlib
    from matplotlib.colors import LinearSegmentedColormap
except ImportError:  # matplotlib is an optional extra
    _matplotlib = None
    LinearSegmentedColormap = None

if TYPE_CHECKING:
    from matplotlib.axes import Axes
    from matplotlib.text import Annotation

__all__ = [
    "DIVERGING_NAME",
    "SEQUENTIAL_NAME",
    "diverging_cmap",
    "label_lines",
    "rc_params",
    "register_cmaps",
    "sequential_cmap",
    "style_path",
    "use",
]

SEQUENTIAL_NAME = "ply-sequential"
DIVERGING_NAME = "ply-diverging"

_STYLE_DIR = Path(__file__).resolve().parent / "styles"
_MODES = ("light", "dark")
_HEX_VALUE = re.compile(r"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?(\s|$)")


def _require() -> None:
    if _matplotlib is None:
        raise ImportError(
            "This function needs matplotlib. Install it with "
            "pip install \"polytope-theme[matplotlib]\"."
        )


def style_path(mode: str = "light") -> Path:
    """Return the path of the generated .mplstyle file for ``mode``.

    Prefer ``use(mode)`` or ``rc_params(mode)``: they read "#RRGGBB" colors
    that ``plt.style.use(path)`` skips when the file writes them unquoted.
    """
    if mode not in _MODES:
        raise ValueError(f"mode must be one of {_MODES!r}, got {mode!r}")
    return _STYLE_DIR / f"polytope-{mode}.mplstyle"


def sequential_cmap(name: str = SEQUENTIAL_NAME, n: int = 256) -> "LinearSegmentedColormap":
    """Cobalt ramp from light to dark, built from the SEQUENTIAL tokens."""
    _require()
    return LinearSegmentedColormap.from_list(name, SEQUENTIAL, N=n)


def diverging_cmap(name: str = DIVERGING_NAME, n: int = 256) -> "LinearSegmentedColormap":
    """Cobalt -> gray midpoint -> tomato, built from the DIVERGING tokens.

    Center the data on the midpoint, for example with
    ``matplotlib.colors.TwoSlopeNorm(vcenter=0)`` or symmetric vmin/vmax.
    """
    _require()
    return LinearSegmentedColormap.from_list(name, DIVERGING, N=n)


def register_cmaps(force: bool = False) -> None:
    """Register ply-sequential, ply-diverging and their _r reversals.

    Names already present are left alone unless ``force`` is true.
    """
    _require()
    for cmap in (sequential_cmap(), diverging_cmap()):
        for item in (cmap, cmap.reversed()):
            if force or item.name not in _matplotlib.colormaps:
                _matplotlib.colormaps.register(item, name=item.name, force=force)


def rc_params(mode: str = "light") -> dict[str, str]:
    """Return the style for ``mode`` as a dict of rcParams values (strings).

    The generated .mplstyle file stores colors as bare hex (``FFFFFF``) because
    matplotlib's rc parser treats an unquoted "#" as a comment. This returns them
    as ``#RRGGBB``. The dict works with ``matplotlib.style.use`` and
    ``matplotlib.rc_context``.
    """
    params: dict[str, str] = {}
    for raw in style_path(mode).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = (part.strip() for part in line.split(":", 1))
        if _HEX_VALUE.match(value):
            value = value.split()[0]
        else:
            value = value.split(" #", 1)[0].strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if re.fullmatch(r"[0-9A-Fa-f]{6}", value):
            value = "#" + value
        params[key] = value
    return params


def use(mode: str = "light") -> None:
    """Apply the style for ``mode`` and make ply-sequential the default image cmap."""
    _require()
    import matplotlib.style

    matplotlib.style.use(rc_params(mode))
    register_cmaps()
    _matplotlib.rcParams["image.cmap"] = SEQUENTIAL_NAME


def _line_end(line: Any) -> tuple[float, float] | None:
    """Return the finite data point with the largest x, or None."""
    xs = line.get_xdata(orig=False)
    ys = line.get_ydata(orig=False)
    best = None
    for x, y in zip(xs, ys):
        try:
            fx, fy = float(x), float(y)
        except (TypeError, ValueError):
            continue
        if not (math.isfinite(fx) and math.isfinite(fy)):
            continue
        if best is None or fx >= best[0]:
            best = (fx, fy)
    return best


def _spread(positions: Sequence[float], gap: float) -> list[float]:
    """Move 1-D positions apart so neighbours are at least ``gap`` apart.

    Colliding labels are grouped and each group is centred on the mean of its
    members, so a label only moves when it overlaps another one.
    """
    order = sorted(range(len(positions)), key=lambda i: positions[i])
    groups: list[tuple[list[int], float]] = []  # (members, first position)
    for idx in order:
        groups.append(([idx], positions[idx]))
        while len(groups) > 1:
            (prev, prev_start), (cur, cur_start) = groups[-2], groups[-1]
            if cur_start - (prev_start + gap * (len(prev) - 1)) >= gap:
                break
            members = prev + cur
            mean = sum(positions[i] for i in members) / len(members)
            groups[-2:] = [(members, mean - gap * (len(members) - 1) / 2)]
    out = [0.0] * len(positions)
    for members, first in groups:
        for k, idx in enumerate(members):
            out[idx] = first + k * gap
    return out


def label_lines(
    ax: "Axes",
    labels: Iterable[str] | None = None,
    *,
    offset: float = 6.0,
    color: str | None = None,
    fontsize: float | str | None = None,
    min_gap: float | None = None,
    leader: bool = True,
    remove_legend: bool = False,
) -> list["Annotation"]:
    """Direct-label each line at its right end, in the text color.

    Labels use ``rcParams["text.color"]`` (or ``color``) and never the series
    color, so the line itself carries the hue and the label stays readable.
    Call it after plotting and after setting axis limits. Overlapping labels
    are spread vertically, and a label moved away from its line gets a thin
    leader line back to the line end.

    Parameters
    ----------
    ax:
        Axes holding the lines.
    labels:
        Optional labels in line order. Defaults to each line's own label;
        lines whose label starts with "_" are skipped.
    offset:
        Horizontal distance from the line end, in points.
    color:
        Label color. Defaults to the style's text color.
    fontsize:
        Label size. Defaults to ``rcParams["legend.fontsize"]``.
    min_gap:
        Minimum vertical distance between labels, in points. Defaults to
        1.2 times the font size.
    leader:
        Draw a leader line for labels moved more than a third of the font size.
    remove_legend:
        Remove an existing legend. Off by default: with two or more series a
        legend stays as the primary key and the labels supplement it.
    """
    _require()
    from matplotlib.font_manager import FontProperties

    rc = _matplotlib.rcParams
    color = color or rc["text.color"]
    fontsize = fontsize if fontsize is not None else rc["legend.fontsize"]
    size_pt = FontProperties(size=fontsize).get_size_in_points()
    gap_pt = min_gap if min_gap is not None else 1.2 * size_pt

    lines = ax.get_lines()
    if labels is None:
        items = [(ln, ln.get_label()) for ln in lines if not str(ln.get_label()).startswith("_")]
    else:
        items = list(zip(lines, labels))

    ends = []
    for line, text in items:
        end = _line_end(line)
        if end is not None:
            ends.append((line, str(text), end))
    if not ends:
        return []

    fig = ax.figure
    points_per_px = 72.0 / fig.dpi
    to_px = ax.transData.transform
    y_pt = [to_px(end)[1] * points_per_px for _, _, end in ends]
    new_y_pt = _spread(y_pt, gap_pt)

    out = []
    for (line, text, end), y0, y1 in zip(ends, y_pt, new_y_pt):
        moved = abs(y1 - y0) > size_pt / 3
        arrowprops = None
        if leader and moved:
            arrowprops = dict(
                arrowstyle="-",
                color=rc["axes.edgecolor"],
                linewidth=0.8,
                shrinkA=1,
                shrinkB=2,
            )
        ann = ax.annotate(
            text,
            xy=end,
            xytext=(offset * (2 if arrowprops else 1), y1 - y0),
            textcoords="offset points",
            ha="left",
            va="center",
            color=color,
            fontsize=fontsize,
            annotation_clip=False,
            arrowprops=arrowprops,
        )
        out.append(ann)

    if remove_legend and ax.get_legend() is not None:
        ax.get_legend().remove()
    return out


if _matplotlib is not None:
    register_cmaps()
