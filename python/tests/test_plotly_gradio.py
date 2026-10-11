import pytest

import polytope_theme as dl


@pytest.mark.parametrize("mode", dl.MODES)
def test_plotly_template(mode):
    pytest.importorskip("plotly")
    from polytope_theme.plotly_theme import template

    t = template(mode)
    c = dl.COLORS[mode]
    assert list(t.layout.colorway) == dl.CATEGORICAL[mode]
    assert t.layout.font.family.startswith("Libre Franklin")
    assert t.layout.paper_bgcolor == dl.SURFACE[mode]
    assert t.layout.plot_bgcolor == dl.SURFACE[mode]
    assert t.layout.yaxis.gridcolor == c["rule"]
    assert t.layout.yaxis.zeroline is False


def test_plotly_register():
    pytest.importorskip("plotly")
    import plotly.io as pio

    from polytope_theme.plotly_theme import register

    before = pio.templates.default
    try:
        register()
        assert "polytope" in pio.templates
        assert "polytope_dark" in pio.templates
        assert pio.templates.default == before
        register(default="dark")
        assert pio.templates.default == "polytope_dark"
    finally:
        pio.templates.default = before


@pytest.mark.parametrize("mode", ["light", "dark", "auto"])
def test_gradio_theme(mode):
    gr = pytest.importorskip("gradio")
    from polytope_theme.gradio_theme import theme

    t = theme(mode)
    assert isinstance(t, gr.themes.Base)
    light = dl.COLORS["dark" if mode == "dark" else "light"]
    assert t.button_primary_background_fill == light["text"]
    assert t.button_primary_background_fill_hover == light["accent"]
    assert t.radius_lg == "0px"


def test_gradio_bad_mode():
    pytest.importorskip("gradio")
    from polytope_theme.gradio_theme import theme

    with pytest.raises(ValueError):
        theme("sepia")
