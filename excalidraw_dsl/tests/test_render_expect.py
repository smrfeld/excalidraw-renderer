from __future__ import annotations

import json
from pathlib import Path

from excalidraw_dsl import Arrow, ArrowEndpoint, Box, Diagram, render_dsl


def _strip_runtime_fields(element: dict) -> dict:
    drop_keys = {"seed", "versionNonce", "updated"}
    return {k: v for k, v in element.items() if k not in drop_keys}


EXPECT_PATH = Path(__file__).with_name("render_expect.json")


def _normalize(elements: list[dict]) -> str:
    return json.dumps(elements, indent=2, sort_keys=True)


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

    expected_data = json.loads(EXPECT_PATH.read_text(encoding="utf-8"))
    expected = _normalize(expected_data).strip()
    actual = _normalize(elements).strip()

    if actual != expected:
        print("EXPECTED:\n" + expected)
        print("ACTUAL:\n" + actual)

    assert actual == expected
