from __future__ import annotations

from typing import Any

from .arrows import render_arrow
from .model import Arrow, Diagram
from .shapes import render_shape
from .state import RenderState


def render_dsl(data: dict[str, Any] | Diagram) -> dict[str, Any]:
    """Render a minimal DSL into Excalidraw JSON.

    Expected DSL shape:
    {
      "grid": 10,
      "styles": {"primary": {"strokeColor": "#111"}},
      "elements": [
        {"id": "a", "type": "box", "x": 0, "y": 0, "w": 120, "h": 80},
        {"id": "b", "type": "ellipse", "x": 200, "y": 0, "w": 120, "h": 80},
        {"id": "t", "type": "text", "x": 10, "y": 10, "text": "Hello"},
        {"type": "arrow", "from": {"ref": "a", "side": "right"}, "to": {"ref": "b", "side": "left"}},
      ]
    }
    """

    diagram = data if isinstance(data, Diagram) else Diagram.from_dict(data)

    state = RenderState(
        grid=diagram.grid,
        styles=diagram.styles or {},
        fit_text=diagram.fit_text,
    )

    ordered: list[tuple[str, Any]] = []
    rendered_by_id: dict[str, dict[str, Any]] = {}

    for element in diagram.elements:
        if isinstance(element, Arrow):
            ordered.append(("arrow", element))
            continue

        rendered = render_shape(element, state)
        rendered_by_id[rendered["id"]] = rendered
        ordered.append(("shape", rendered["id"]))

    result_elements: list[dict[str, Any]] = []
    for kind, payload in ordered:
        if kind == "shape":
            result_elements.append(rendered_by_id[payload])
            continue

        arrow = render_arrow(payload, state)
        result_elements.append(arrow)

    return {"elements": result_elements}
