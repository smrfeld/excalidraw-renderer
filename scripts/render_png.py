#!/usr/bin/env python3
"""Render an Excalidraw JSON file to PNG via the local render API."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request


def parse_args() -> argparse.Namespace:
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
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    with open(args.input, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if args.scale is not None:
        payload["exportScale"] = args.scale
    if args.padding is not None:
        payload["exportPadding"] = args.padding
    if args.background is not None:
        payload["backgroundColor"] = args.background
    if args.dark:
        payload["darkMode"] = True

    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        args.endpoint,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request) as response:
            if response.status != 200:
                sys.stderr.write(f"Render failed with status {response.status}\n")
                return 1
            png_bytes = response.read()
    except urllib.error.HTTPError as exc:
        sys.stderr.write(f"Render failed: {exc.read().decode('utf-8')}\n")
        return 1
    except urllib.error.URLError as exc:
        sys.stderr.write(f"Could not reach renderer: {exc}\n")
        return 1

    with open(args.output, "wb") as handle:
        handle.write(png_bytes)

    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
