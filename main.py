from __future__ import annotations

from pathlib import Path

import click

from excalidraw_renderer.client import render_png


@click.command(context_settings={"help_option_names": ["-h", "--help"]})
@click.argument("input", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.argument("output", type=click.Path(dir_okay=False, path_type=Path))
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
def main(
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
    """Render an Excalidraw JSON file to PNG via the local render API."""

    try:
        render_png(
            input,
            output,
            endpoint=endpoint,
            export_scale=scale,
            export_padding=padding,
            max_size=max_size,
            quality=quality,
            background_color=background,
            dark_mode=dark,
        )
    except RuntimeError as exc:
        raise click.ClickException(str(exc)) from exc

    click.echo(f"Wrote {output}")


if __name__ == "__main__":
    main()
