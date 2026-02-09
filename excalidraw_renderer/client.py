from __future__ import annotations

import json
import urllib.request
from pathlib import Path
from typing import Any


def render_png(
    input_path: str | Path,
    output_path: str | Path,
    *,
    endpoint: str = "http://localhost:3000/api/render",
    export_scale: float | None = None,
    export_padding: float | None = None,
    max_size: float | None = None,
    quality: float | None = None,
    background_color: str | None = None,
    dark_mode: bool = False,
) -> None:
    """Render an Excalidraw JSON file to PNG using the local render API."""

    input_path = Path(input_path)
    output_path = Path(output_path)

    with input_path.open("r", encoding="utf-8") as handle:
        payload: dict[str, Any] = json.load(handle)

    if export_scale is not None:
        payload["exportScale"] = export_scale
    if export_padding is not None:
        payload["exportPadding"] = export_padding
    if max_size is not None:
        payload["maxSize"] = max_size
    if quality is not None:
        payload["quality"] = quality
    if background_color is not None:
        payload["backgroundColor"] = background_color
    if dark_mode:
        payload["darkMode"] = True

    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request) as response:
            if response.status != 200:
                raise RuntimeError(f"Render failed with status {response.status}")
            png_bytes = response.read()
    except urllib.error.HTTPError as exc:  # pyright: ignore[reportAttributeAccessIssue]
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"Render failed: {detail}") from exc
    except urllib.error.URLError as exc:  # pyright: ignore[reportAttributeAccessIssue]
        raise RuntimeError(f"Could not reach renderer: {exc}") from exc

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(png_bytes)


def render_mermaid(
    mermaid: str | Path,
    output_path: str | Path,
    *,
    endpoint: str = "http://localhost:3000/api/render-mermaid",
    config: dict[str, Any] | None = None,
    export_scale: float | None = None,
    export_padding: float | None = None,
    max_size: float | None = None,
    quality: float | None = None,
    background_color: str | None = None,
    dark_mode: bool = False,
) -> None:
    """Render a Mermaid diagram to PNG using the local render API."""

    if isinstance(mermaid, Path) or Path(str(mermaid)).exists():
        mermaid_text = Path(mermaid).read_text(encoding="utf-8")
    else:
        mermaid_text = str(mermaid)

    output_path = Path(output_path)
    payload: dict[str, Any] = {"mermaid": mermaid_text}

    if config is not None:
        payload["config"] = config
    if export_scale is not None:
        payload["exportScale"] = export_scale
    if export_padding is not None:
        payload["exportPadding"] = export_padding
    if max_size is not None:
        payload["maxSize"] = max_size
    if quality is not None:
        payload["quality"] = quality
    if background_color is not None:
        payload["backgroundColor"] = background_color
    if dark_mode:
        payload["darkMode"] = True

    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request) as response:
            if response.status != 200:
                raise RuntimeError(f"Render failed with status {response.status}")
            png_bytes = response.read()
    except urllib.error.HTTPError as exc:  # pyright: ignore[reportAttributeAccessIssue]
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"Render failed: {detail}") from exc
    except urllib.error.URLError as exc:  # pyright: ignore[reportAttributeAccessIssue]
        raise RuntimeError(f"Could not reach renderer: {exc}") from exc

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(png_bytes)
