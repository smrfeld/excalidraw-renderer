from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Self


@dataclass(frozen=True, kw_only=True)
class StyleOverrides:
    strokeColor: str | None = None
    backgroundColor: str | None = None
    fillStyle: str | None = None
    strokeWidth: float | None = None
    strokeStyle: str | None = None
    roughness: float | None = None
    opacity: float | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        return cls(**data)


@dataclass(frozen=True, kw_only=True)
class StylePreset(StyleOverrides):
    pass


@dataclass(frozen=True, kw_only=True)
class BaseElement:
    id: str | None = None
    style: str | None = None
    style_overrides: StyleOverrides | None = None


@dataclass(frozen=True, kw_only=True)
class Box(BaseElement):
    x: float
    y: float
    w: float
    h: float


@dataclass(frozen=True, kw_only=True)
class Ellipse(BaseElement):
    x: float
    y: float
    w: float
    h: float


@dataclass(frozen=True, kw_only=True)
class Diamond(BaseElement):
    x: float
    y: float
    w: float
    h: float


@dataclass(frozen=True, kw_only=True)
class Text(BaseElement):
    x: float
    y: float
    text: str
    w: float | None = None
    h: float | None = None
    fontSize: float = 20
    fontFamily: int = 1
    lineHeight: float = 1.25
    padding: float = 6
    textAlign: str = "center"
    verticalAlign: str = "middle"


@dataclass(frozen=True, kw_only=True)
class ArrowEndpoint:
    ref: str
    side: str = "center"


@dataclass(frozen=True, kw_only=True)
class Arrow(BaseElement):
    from_: ArrowEndpoint
    to: ArrowEndpoint


Element = Box | Ellipse | Diamond | Text | Arrow


@dataclass(frozen=True, kw_only=True)
class Diagram:
    elements: list[Element]
    grid: float = 10
    styles: dict[str, StylePreset] | None = None
    fit_text: bool = False

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Diagram":
        if not isinstance(data, dict):
            raise ValueError("DSL root must be an object")
        elements_raw = data.get("elements")
        if not isinstance(elements_raw, list):
            raise ValueError("DSL must include an 'elements' array")
        grid = data.get("grid", 10)
        if grid is None:
            grid = 0
        if not isinstance(grid, (int, float)) or grid < 0:
            raise ValueError("grid must be a non-negative number")
        styles_raw: dict = data.get("styles", {}) or {}
        if not isinstance(styles_raw, dict):
            raise ValueError("styles must be an object if provided")
        styles: dict[str, StylePreset] = {
            name: StylePreset.from_dict(preset)
            for name, preset in styles_raw.items()
            if isinstance(preset, dict)
        }
        elements = [_element_from_dict(item) for item in elements_raw]
        return cls(
            elements=elements,
            grid=float(grid),
            styles=styles,
            fit_text=bool(data.get("fitText", False)),
        )


def _style_overrides_from_dict(data: dict[str, Any] | None) -> StyleOverrides | None:
    if not data:
        return None
    if not isinstance(data, dict):
        raise ValueError("styleOverrides must be an object if provided")
    return StyleOverrides.from_dict(data)


def _base_kwargs(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": raw.get("id"),
        "style": raw.get("style"),
        "style_overrides": _style_overrides_from_dict(raw.get("styleOverrides")),
    }


def _element_from_dict(raw: dict[str, Any]) -> Element:
    if not isinstance(raw, dict):
        raise ValueError("Each element must be an object")
    element_type = raw.get("type")
    if not isinstance(element_type, str):
        raise ValueError("Each element must include a string 'type'")

    base = _base_kwargs(raw)
    element_type = element_type.lower()

    if element_type == "box":
        return Box(x=raw["x"], y=raw["y"], w=raw["w"], h=raw["h"], **base)
    if element_type == "ellipse":
        return Ellipse(x=raw["x"], y=raw["y"], w=raw["w"], h=raw["h"], **base)
    if element_type == "diamond":
        return Diamond(x=raw["x"], y=raw["y"], w=raw["w"], h=raw["h"], **base)
    if element_type == "text":
        return Text(
            x=raw.get("x", 0),
            y=raw.get("y", 0),
            text=raw.get("text", ""),
            w=raw.get("w"),
            h=raw.get("h"),
            fontSize=raw.get("fontSize", 20),
            fontFamily=raw.get("fontFamily", 1),
            lineHeight=raw.get("lineHeight", 1.25),
            padding=raw.get("padding", 6),
            textAlign=raw.get("textAlign", "center"),
            verticalAlign=raw.get("verticalAlign", "middle"),
            **base,
        )
    if element_type == "arrow":
        from_spec = raw.get("from")
        to_spec = raw.get("to")
        if not isinstance(from_spec, dict) or not isinstance(to_spec, dict):
            raise ValueError("Arrow must include 'from' and 'to' objects")
        from_ref = from_spec.get("ref")
        to_ref = to_spec.get("ref")
        if not isinstance(from_ref, str) or not isinstance(to_ref, str):
            raise ValueError("Arrow refs must be strings")
        return Arrow(
            from_=ArrowEndpoint(ref=from_ref, side=from_spec.get("side", "center")),
            to=ArrowEndpoint(ref=to_ref, side=to_spec.get("side", "center")),
            **base,
        )

    raise ValueError(f"Unsupported element type '{element_type}'")
