from __future__ import annotations

import json

import expect_def as expect

from excalidraw_dsl import Arrow, ArrowEndpoint, Box, Diagram, render_dsl


def _strip_runtime_fields(element: dict) -> dict:
    drop_keys = {"seed", "versionNonce", "updated"}
    return {k: v for k, v in element.items() if k not in drop_keys}


def _normalize(elements: list[dict]) -> str:
    return json.dumps(elements, indent=2, sort_keys=True)


@expect.test
def test_render_dsl_expect() -> None:
    diagram = Diagram(
        grid=10,
        elements=[
            Box(id="a", x=0, y=0, w=100, h=60),
            Box(id="b", x=200, y=0, w=100, h=60),
            Arrow(
                id="arrow-ab",
                from_=ArrowEndpoint(ref="a", side="right"),
                to=ArrowEndpoint(ref="b", side="left"),
            ),
        ],
    )

    rendered = render_dsl(diagram)
    elements = [_strip_runtime_fields(el) for el in rendered["elements"]]

    print(_normalize(elements))

    """
    [
        {
            "angle": 0,
            "backgroundColor": "transparent",
            "boundElements": null,
            "fillStyle": "solid",
            "frameId": null,
            "groupIds": [],
            "height": 60,
            "id": "a",
            "isDeleted": false,
            "link": null,
            "locked": false,
            "opacity": 100,
            "roughness": 1,
            "roundness": {
                "type": 3
            },
            "strokeColor": "#1e1e1e",
            "strokeStyle": "solid",
            "strokeWidth": 2,
            "type": "rectangle",
            "version": 1,
            "width": 100,
            "x": 0,
            "y": 0
        },
        {
            "angle": 0,
            "backgroundColor": "transparent",
            "boundElements": null,
            "fillStyle": "solid",
            "frameId": null,
            "groupIds": [],
            "height": 60,
            "id": "b",
            "isDeleted": false,
            "link": null,
            "locked": false,
            "opacity": 100,
            "roughness": 1,
            "roundness": {
                "type": 3
            },
            "strokeColor": "#1e1e1e",
            "strokeStyle": "solid",
            "strokeWidth": 2,
            "type": "rectangle",
            "version": 1,
            "width": 100,
            "x": 200,
            "y": 0
        },
        {
            "angle": 0,
            "backgroundColor": "transparent",
            "boundElements": null,
            "endArrowhead": "arrow",
            "endBinding": null,
            "fillStyle": "solid",
            "frameId": null,
            "groupIds": [],
            "height": 0,
            "id": "arrow-ab",
            "isDeleted": false,
            "lastCommittedPoint": null,
            "link": null,
            "locked": false,
            "opacity": 100,
            "points": [
                [
                    0,
                    0
                ],
                [
                    100,
                    0
                ]
            ],
            "roughness": 1,
            "roundness": {
                "type": 2
            },
            "startArrowhead": null,
            "startBinding": null,
            "strokeColor": "#1e1e1e",
            "strokeStyle": "solid",
            "strokeWidth": 2,
            "type": "arrow",
            "version": 1,
            "width": 100,
            "x": 100,
            "y": 30
        }
    ]
    """
