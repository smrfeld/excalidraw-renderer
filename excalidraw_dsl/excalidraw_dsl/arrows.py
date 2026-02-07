from __future__ import annotations

from typing import Any

from .model import Arrow
from .styles import merge_style
from .state import RenderState


def render_arrow(element: Arrow, state: RenderState) -> dict[str, Any]:
    element_id = element.id or state.next_id("arrow")
    if not isinstance(element_id, str):
        raise ValueError("Arrow id must be a string")

    from_ref = element.from_.ref
    to_ref = element.to.ref
    if not isinstance(from_ref, str) or not isinstance(to_ref, str):
        raise ValueError("Arrow refs must be strings")

    if from_ref not in state.bboxes or to_ref not in state.bboxes:
        raise ValueError("Arrow refs must point to existing elements")

    from_side = element.from_.side
    to_side = element.to.side
    if not isinstance(from_side, str) or not isinstance(to_side, str):
        raise ValueError("Arrow sides must be strings")

    start = state.bboxes[from_ref].anchor(from_side)
    end = state.bboxes[to_ref].anchor(to_side)

    start_x = state.snap(start[0])
    start_y = state.snap(start[1])
    end_x = state.snap(end[0])
    end_y = state.snap(end[1])

    dx = end_x - start_x
    dy = end_y - start_y

    style = merge_style(element.style, element.style_overrides, state.styles)

    return {
        "id": element_id,
        "type": "arrow",
        "x": start_x,
        "y": start_y,
        "width": dx,
        "height": dy,
        "angle": 0,
        **style,
        "groupIds": [],
        "frameId": None,
        "roundness": {"type": 2},
        "seed": state.counter,
        "version": 1,
        "versionNonce": state.counter + 100,
        "isDeleted": False,
        "boundElements": None,
        "updated": state.timestamp(),
        "link": None,
        "locked": False,
        "points": [[0, 0], [dx, dy]],
        "startBinding": None,
        "endBinding": None,
        "lastCommittedPoint": None,
        "startArrowhead": None,
        "endArrowhead": "arrow",
    }
