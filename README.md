# Minimal Excalidraw example with Next.js

A very minimal example showing Excalidraw running in a local browser using Next.js App Router.

## Packages used

- next: React framework
- react, react-dom: React runtime
- @excalidraw/excalidraw: Excalidraw canvas
- typescript, @types/*: TypeScript types
- eslint, eslint-config-next: linting

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Render API (PNG output)

POST /api/render with a JSON body containing an Excalidraw scene.

Example payload (same shape as public/example_drawing.json):

{ "elements": [ ... ] }

The response is a PNG image.

Optional render settings (include in the JSON body):

- exportScale: number (e.g. 2 for 2x size / sharper output)
- exportPadding: number (pixels of padding around the drawing)
- maxSize: number (max width/height in pixels)
- quality: number (0-1, primarily for lossy formats)
- backgroundColor: string (e.g. "#ffffff" or "transparent")
- darkMode: boolean

Note: the renderer uses Playwright/Chromium. If the browser binaries are missing on your machine, install them with Playwright.

## Python entry point

With the dev server running, render a JSON file to PNG:

python main.py public/example_drawing.json output.png

With options:

python main.py public/example_drawing.json output.png --scale 2 --padding 24 --background "#ffffff"

Scale-based sharpness example:

python main.py public/example_drawing.json output.png --scale 4

## Installable package (optional)

Install in editable mode:

pip install -e .

Then use the console script:

excalidraw-render public/example_drawing.json output.png --scale 2 --padding 24

## Structure

- app/page.tsx: loads JSON, renders Excalidraw, exports a PNG preview
- app/layout.tsx: minimal layout
- app/globals.css: minimal styles
- public/example_drawing.json: the Excalidraw scene file loaded at runtime
- app/api/render/route.ts: headless renderer that returns PNGs
- excalidraw_renderer/: Python package for rendering
- main.py: CLI entry point for rendering
- scripts/render_png.py: legacy wrapper for the render CLI
