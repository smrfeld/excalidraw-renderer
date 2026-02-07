from __future__ import annotations

from typing import Any

from .model import StyleOverrides, StylePreset

DEFAULT_STYLE = {
    "strokeColor": "#1e1e1e",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 1,
    "opacity": 100,
}

TEXT_DEFAULTS = {
    "strokeColor": "#1e1e1e",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 1,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
}


def merge_style(
    style_name: str | None,
    overrides: StyleOverrides | None,
    presets: dict[str, StylePreset],
) -> dict[str, Any]:
    style = dict(DEFAULT_STYLE)

    if style_name is not None:
        if not isinstance(style_name, str):
            raise ValueError("style must be a string if provided")
        preset = presets.get(style_name)
        if preset is None:
            raise ValueError(f"Unknown style preset '{style_name}'")
        style.update({k: v for k, v in preset.__dict__.items() if v is not None})

    if overrides is not None:
        style.update({k: v for k, v in overrides.__dict__.items() if v is not None})

    return style
