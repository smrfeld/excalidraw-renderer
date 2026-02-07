from __future__ import annotations

from dataclasses import dataclass


@dataclass
class BBox:
    x: float
    y: float
    w: float
    h: float

    def anchor(self, side: str) -> tuple[float, float]:
        side = side.lower()
        if side == "left":
            return self.x, self.y + self.h / 2
        if side == "right":
            return self.x + self.w, self.y + self.h / 2
        if side == "top":
            return self.x + self.w / 2, self.y
        if side == "bottom":
            return self.x + self.w / 2, self.y + self.h
        if side == "center":
            return self.x + self.w / 2, self.y + self.h / 2
        raise ValueError(f"Unknown side '{side}'")
