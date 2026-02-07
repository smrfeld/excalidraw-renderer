from __future__ import annotations

from typing import Any

from .model import Box, Diamond, Ellipse, Text
from .styles import TEXT_DEFAULTS, merge_style
from .text import estimate_text_size
from .types import BBox
from .state import RenderState


def _read_box(
    element: Box | Ellipse | Diamond, state: RenderState
) -> tuple[float, float, float, float]:
    x = state.snap(float(element.x))
    y = state.snap(float(element.y))
    w = state.snap(float(element.w))
    h = state.snap(float(element.h))
    return x, y, w, h


def render_shape(
    element: Box | Ellipse | Diamond | Text, state: RenderState
) -> dict[str, Any]:
    element_type = element.__class__.__name__.lower()
    element_id = element.id or state.next_id(element_type)
    if not isinstance(element_id, str):
        raise ValueError("Element id must be a string")

    style = merge_style(element.style, element.style_overrides, state.styles)

    if isinstance(element, (Box, Ellipse, Diamond)):
        x, y, w, h = _read_box(element, state)
        excalidraw_type = "rectangle" if isinstance(element, Box) else element_type
        roundness = {"type": 3} if isinstance(element, Box) else {"type": 2}

        compiled = {
            "id": element_id,
            "type": excalidraw_type,
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "angle": 0,
            **style,
            "groupIds": [],
            "frameId": None,
            "roundness": roundness,
            "seed": state.counter,
            "version": 1,
            "versionNonce": state.counter + 100,
            "isDeleted": False,
            "boundElements": None,
            "updated": state.timestamp(),
            "link": None,
            "locked": False,
        }
        state.bboxes[element_id] = BBox(x, y, w, h)
        return compiled

    if isinstance(element, Text):
        text_value = element.text
        if not text_value:
            raise ValueError("Text elements require a non-empty 'text'")

        font_size = float(element.fontSize)
        font_family = int(element.fontFamily)
        line_height = float(element.lineHeight)
        padding = float(element.padding)

        if element.w is not None or element.h is not None or state.fit_text:
            width, height = estimate_text_size(
                text_value,
                font_size,
                line_height,
                padding,
            )
        else:
            width = float(element.w or 0)
            height = float(element.h or 0)

        x = state.snap(float(element.x))
        y = state.snap(float(element.y))
        width = state.snap(width)
        height = state.snap(height)

        compiled = {
            "id": element_id,
            "type": "text",
            "x": x,
            "y": y,
            "width": width,
            "height": height,
            "angle": 0,
            **TEXT_DEFAULTS,
            "groupIds": [],
            "frameId": None,
            "roundness": None,
            "seed": state.counter,
            "version": 1,
            "versionNonce": state.counter + 100,
            "isDeleted": False,
            "boundElements": None,
            "updated": state.timestamp(),
            "link": None,
            "locked": False,
            "text": text_value,
            "fontSize": font_size,
            "fontFamily": font_family,
            "textAlign": element.textAlign,
            "verticalAlign": element.verticalAlign,
            "baseline": int(height - padding),
            "containerId": None,
            "originalText": text_value,
            "lineHeight": line_height,
        }
        state.bboxes[element_id] = BBox(x, y, width, height)
        return compiled

    raise ValueError(f"Unsupported element type '{element_type}'")
