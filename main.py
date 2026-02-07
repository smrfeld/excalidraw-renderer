from __future__ import annotations

from pathlib import Path

import click
from tqdm import tqdm

from excalidraw_renderer.client import render_png


@click.command(context_settings={"help_option_names": ["-h", "--help"]})
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
    """Render Excalidraw JSON file(s) to PNG via the local render API."""

    if input.is_dir():
        if output.exists() and output.is_file():
            raise click.ClickException("When input is a directory, output must be a directory")
        if output.suffix:
            raise click.ClickException("Output must be a directory path when input is a directory")

        output.mkdir(parents=True, exist_ok=True)
        json_files = sorted(input.glob("*.json"))
        if not json_files:
            raise click.ClickException("No .json files found in input directory")

        for json_path in tqdm(json_files, desc="Rendering", unit="file"):
            out_path = output / f"{json_path.stem}.png"
            try:
                render_png(
                    json_path,
                    out_path,
                    endpoint=endpoint,
                    export_scale=scale,
                    export_padding=padding,
                    max_size=max_size,
                    quality=quality,
                    background_color=background,
                    dark_mode=dark,
                )
            except RuntimeError as exc:
                raise click.ClickException(f"{json_path.name}: {exc}") from exc

        click.echo(f"Wrote {len(json_files)} file(s) to {output}")
        return

    if output.exists() and output.is_dir():
        raise click.ClickException("When input is a file, output must be a file path")

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
