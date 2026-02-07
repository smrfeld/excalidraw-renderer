from __future__ import annotations


def estimate_text_size(
    text: str,
    font_size: float,
    line_height: float,
    padding: float,
) -> tuple[float, float]:
    lines = text.splitlines() or [""]
    max_len = max(len(line) for line in lines)
    width = max_len * font_size * 0.6 + padding * 2
    height = len(lines) * font_size * line_height + padding * 2
    return width, height
