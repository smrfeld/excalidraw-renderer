# Render Excalidraw drawings

Render Excalidraw drawings to images. A Python API sends JSON files to a server. The API can be accessed from CLI or as a Python package.

## Run

In the main directory, start the server:

```bash
npm install --prefix server
npm run dev
```


Then:

```bash
pip install .
python main.py examples output --scale 3
```

## Other server commands

- `npm run build`
- `npm run start`
- `npm run lint`


## Render API (PNG output)

POST `/api/render` with a JSON body containing an Excalidraw scene.

Example payload (same shape as `server/public/example_drawing.json`):

```json
{ "elements": [ ... ] }
```

The response is a PNG image.

Optional render settings (include in the JSON body):

- `exportScale`: number (e.g. `2` for 2x size / sharper output)
- `exportPadding`: number (pixels of padding around the drawing)
- `maxSize`: number (max width/height in pixels)
- `quality`: number (`0`-`1`, primarily for lossy formats)
- `backgroundColor`: string (e.g. `"#ffffff"` or `"transparent"`)
- `darkMode`: boolean

Note: the renderer uses Playwright/Chromium. If the browser binaries are missing on your machine, install them with Playwright.

## Python entry point

With the dev server running, render a JSON file to PNG:

```bash
python main.py server/public/example_drawing.json output.png
```

With options:

```bash
python main.py server/public/example_drawing.json output.png --scale 2 --padding 24 --background "#ffffff"
```

Scale-based sharpness example:

```bash
python main.py server/public/example_drawing.json output.png --scale 4
```

Render a whole directory (all `.json` files):

```bash
python main.py examples output_dir --scale 4
```

## Installable package (optional)

Install in editable mode:

```bash
pip install -e .
```

Then use the console script:

```bash
excalidraw-render server/public/example_drawing.json output.png --scale 2 --padding 24
```

Directory mode:

```bash
excalidraw-render examples output_dir --scale 4
```

## Structure

- `server/app/page.tsx`: loads JSON, renders Excalidraw, exports a PNG preview
- `server/app/layout.tsx`: minimal layout
- `server/app/globals.css`: minimal styles
- `server/public/example_drawing.json`: the Excalidraw scene file loaded at runtime
- `server/app/api/render/route.ts`: headless renderer that returns PNGs
- `excalidraw_renderer/`: Python package for rendering
- `main.py`: CLI entry point for rendering
- `scripts/render_png.py`: legacy wrapper for the render CLI
- `examples/`: sample Excalidraw JSON files
