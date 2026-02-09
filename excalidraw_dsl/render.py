from __future__ import annotations

import json
from pathlib import Path

import click

from excalidraw_dsl import render_dsl


@click.command(context_settings={"help_option_names": ["-h", "--help"]})
@click.argument("input", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.argument("output", type=click.Path(dir_okay=False, path_type=Path))
def main(input: Path, output: Path) -> None:
    """Render a DSL JSON file into Excalidraw JSON."""
    data = json.loads(input.read_text(encoding="utf-8"))
    rendered = render_dsl(data)

    output.write_text(
        json.dumps(rendered, indent=2, sort_keys=True),
        encoding="utf-8",
    )

    click.echo(f"Wrote {output}")


if __name__ == "__main__":
    main()
