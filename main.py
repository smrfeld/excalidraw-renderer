from __future__ import annotations

import argparse
from pathlib import Path

from excalidraw_renderer.client import render_png


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Render Excalidraw JSON to PNG")
    parser.add_argument("input", help="Path to Excalidraw JSON file")
    parser.add_argument("output", help="Path to write PNG")
    parser.add_argument(
        "--endpoint",
        default="http://localhost:3000/api/render",
        help="Render API endpoint",
    )
    parser.add_argument(
        "--scale",
        type=float,
        help="PNG scale factor (e.g. 2 for 2x)",
    )
    parser.add_argument(
        "--padding",
        type=float,
        help="Padding around the drawing in pixels",
    )
    parser.add_argument(
        "--background",
        help="Background color (e.g. #ffffff or transparent)",
    )
    parser.add_argument(
        "--dark",
        action="store_true",
        help="Export with dark mode enabled",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        render_png(
            Path(args.input),
            Path(args.output),
            endpoint=args.endpoint,
            export_scale=args.scale,
            export_padding=args.padding,
            background_color=args.background,
            dark_mode=args.dark,
        )
    except RuntimeError as exc:
        parser.error(str(exc))
        return 1

    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
