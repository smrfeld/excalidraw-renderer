from __future__ import annotations

from time import time
from typing import Any

from .types import BBox


class RenderState:
    def __init__(self, grid: float, styles: dict[str, Any], fit_text: bool) -> None:
        self.grid = grid
        self.styles = styles
        self.fit_text = fit_text
        self.counter = 1
        self.start_time = int(time() * 1000)
        self.bboxes: dict[str, BBox] = {}

    def next_id(self, prefix: str) -> str:
        value = f"{prefix}-{self.counter}"
        self.counter += 1
        return value

    def timestamp(self) -> int:
        value = self.start_time + self.counter
        self.counter += 1
        return value

    def snap(self, value: float) -> float:
        if self.grid == 0:
            return value
        return round(value / self.grid) * self.grid
