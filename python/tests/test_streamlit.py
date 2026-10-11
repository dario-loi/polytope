import sys

import pytest

import polytope_theme as dl
from polytope_theme.streamlit_theme import config_toml, write_config

if sys.version_info >= (3, 11):
    import tomllib
else:  # pragma: no cover
    tomllib = None


@pytest.mark.parametrize("mode", dl.MODES)
def test_config_toml_content(mode):
    text = config_toml(mode)
    c = dl.COLORS[mode]
    assert "[theme]" in text
    assert f'base = "{mode}"' in text
    assert f'primaryColor = "{c["accent"]}"' in text
    assert f'backgroundColor = "{c["bg"]}"' in text
    assert f'secondaryBackgroundColor = "{c["surface_sunken"]}"' in text
    assert f'textColor = "{c["text"]}"' in text
    assert "Libre Franklin" in text
    assert "JetBrains Mono" in text
    assert text.isascii()


@pytest.mark.skipif(tomllib is None, reason="tomllib needs Python 3.11")
def test_config_toml_parses():
    theme = tomllib.loads(config_toml("light"))["theme"]
    assert theme["chartCategoricalColors"] == dl.CATEGORICAL["light"]
    assert theme["font"].startswith("'Libre Franklin':https://")
    plain = tomllib.loads(config_toml("dark", google_fonts=False))["theme"]
    assert plain["font"] == "sans-serif"
    assert plain["codeFont"] == "monospace"


def test_write_config(tmp_path):
    target = tmp_path / ".streamlit" / "config.toml"
    assert write_config(target, mode="dark") == target
    assert target.read_text() == config_toml("dark")
    # A file we wrote can be regenerated.
    write_config(target, mode="light")
    assert 'base = "light"' in target.read_text()


def test_write_config_keeps_foreign_file(tmp_path):
    target = tmp_path / "config.toml"
    target.write_text("[server]\nport = 8600\n")
    with pytest.raises(FileExistsError):
        write_config(target)
    write_config(target, overwrite=True)
    assert "[server]" not in target.read_text()


def test_bad_mode():
    with pytest.raises(ValueError):
        config_toml("auto")


def test_streamlit_accepts_config():
    pytest.importorskip("streamlit")
    from streamlit import config

    try:
        config.get_config_options()
        for mode in dl.MODES:
            config._update_config_with_toml(config_toml(mode), "polytope_theme test")
            assert config.get_option("theme.base") == mode
            assert config.get_option("theme.primaryColor") == dl.COLORS[mode]["accent"]
    except AttributeError as exc:  # private API moved
        pytest.skip(f"streamlit config internals changed: {exc}")
