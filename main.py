from __future__ import annotations

from pathlib import Path

import click
from tqdm import tqdm
from typing import Callable
from excalidraw_renderer.client import render_mermaid, render_png


def _render_files(
    *,
    input_path: Path,
    output_path: Path,
    pattern: str,
    render: Callable,
    render_kwargs: dict[str, object],
) -> None:
    if input_path.is_dir():
        if output_path.exists() and output_path.is_file():
            raise click.ClickException(
                "When input is a directory, output must be a directory"
            )
        if output_path.suffix:
            raise click.ClickException(
                "Output must be a directory path when input is a directory"
            )

        output_path.mkdir(parents=True, exist_ok=True)
        files = sorted(input_path.glob(pattern))
        if not files:
            raise click.ClickException(f"No {pattern} files found in input directory")

        for file_path in tqdm(files, desc="Rendering", unit="file"):
            out_path = output_path / f"{file_path.stem}.png"
            try:
                render(file_path, out_path, **render_kwargs)
            except RuntimeError as exc:
                raise click.ClickException(f"{file_path.name}: {exc}") from exc

        click.echo(f"Wrote {len(files)} file(s) to {output_path}")
        return

    if output_path.exists() and output_path.is_dir():
        out_file = output_path / f"{input_path.stem}.png"
    else:
        out_file = output_path

    try:
        render(input_path, out_file, **render_kwargs)
    except RuntimeError as exc:
        raise click.ClickException(str(exc)) from exc

    click.echo(f"Wrote {out_file}")


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
def main() -> None:
    """Render Excalidraw JSON or Mermaid to PNG via the local render API."""


@main.command("render")
@click.argument("input", type=click.Path(exists=True, path_type=Path))
@click.argument("output", type=click.Path(path_type=Path))
@click.option(
    "--endpoint",
    default="http://localhost:3000/api/render",
    show_default=True,
    help="Render API endpoint",
)
@click.option("--scale", type=float, help="PNG scale factor (e.g. 2 for 2x)")
@click.option("--padding", type=float, help="Padding around the drawing in pixels")
@click.option(
    "--max-size",
    type=float,
    help="Maximum width or height of the output image in pixels",
)
@click.option(
    "--quality",
    type=float,
    help="Image quality (0-1, primarily for lossy formats)",
)
@click.option(
    "--background",
    help="Background color (e.g. #ffffff or transparent)",
)
@click.option("--dark", is_flag=True, help="Export with dark mode enabled")
def render_command(
    input: Path,
    output: Path,
    endpoint: str,
    scale: float | None,
    padding: float | None,
    max_size: float | None,
    quality: float | None,
    background: str | None,
    dark: bool,
) -> None:
    """Render Excalidraw JSON file(s) to PNG via the local render API."""

    render_kwargs = {
        "endpoint": endpoint,
        "export_scale": scale,
        "export_padding": padding,
        "max_size": max_size,
        "quality": quality,
        "background_color": background,
        "dark_mode": dark,
    }

    _render_files(
        input_path=input,
        output_path=output,
        pattern="*.json",
        render=render_png,
        render_kwargs=render_kwargs,
    )


@main.command("mermaid")
@click.argument("input", type=click.Path(exists=True, path_type=Path))
@click.argument("output", type=click.Path(path_type=Path))
@click.option(
    "--endpoint",
    default="http://localhost:3000/api/render-mermaid",
    show_default=True,
    help="Mermaid render API endpoint",
)
@click.option("--scale", type=float, help="PNG scale factor (e.g. 2 for 2x)")
@click.option("--padding", type=float, help="Padding around the drawing in pixels")
@click.option(
    "--max-size",
    type=float,
    help="Maximum width or height of the output image in pixels",
)
@click.option(
    "--quality",
    type=float,
    help="Image quality (0-1, primarily for lossy formats)",
)
@click.option(
    "--background",
    help="Background color (e.g. #ffffff or transparent)",
)
@click.option("--dark", is_flag=True, help="Export with dark mode enabled")
def mermaid_command(
    input: Path,
    output: Path,
    endpoint: str,
    scale: float | None,
    padding: float | None,
    max_size: float | None,
    quality: float | None,
    background: str | None,
    dark: bool,
) -> None:
    """Render a Mermaid diagram text file to PNG via the local render API."""
    render_kwargs = {
        "endpoint": endpoint,
        "export_scale": scale,
        "export_padding": padding,
        "max_size": max_size,
        "quality": quality,
        "background_color": background,
        "dark_mode": dark,
    }

    _render_files(
        input_path=input,
        output_path=output,
        pattern="*.mmd",
        render=render_mermaid,
        render_kwargs=render_kwargs,
    )


if __name__ == "__main__":
    main()
