import { NextResponse } from "next/server";
import type { Browser } from "playwright";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { JSDOM } from "jsdom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resolveNodeModulesRoot = () => {
    const candidates = [
        path.join(process.cwd(), "node_modules"),
        path.join(process.cwd(), "server", "node_modules"),
        path.join(process.cwd(), "..", "node_modules"),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return candidates[0];
};

const nodeModulesRoot = resolveNodeModulesRoot();
const reactPath = path.join(
    nodeModulesRoot,
    "react",
    "umd",
    "react.production.min.js",
);
const reactDomPath = path.join(
    nodeModulesRoot,
    "react-dom",
    "umd",
    "react-dom.production.min.js",
);
const excalidrawPath = path.join(
    nodeModulesRoot,
    "@excalidraw",
    "excalidraw",
    "dist",
    "excalidraw.production.min.js",
);

type RenderMermaidPayload = {
    mermaid: string;
    config?: Record<string, unknown>;
    exportScale?: number;
    exportPadding?: number;
    maxSize?: number;
    quality?: number;
    backgroundColor?: string;
    darkMode?: boolean;
};

let browserPromise: Promise<Browser> | null = null;

const getBrowser = () => {
    if (!browserPromise) {
        browserPromise = chromium.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }
    return browserPromise;
};

export async function POST(request: Request) {
    let payload: RenderMermaidPayload;
    try {
        payload = (await request.json()) as RenderMermaidPayload;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!payload?.mermaid || typeof payload.mermaid !== "string") {
        return NextResponse.json(
            { error: "Payload must include a mermaid string" },
            { status: 400 },
        );
    }

    if (payload.exportScale !== undefined) {
        if (typeof payload.exportScale !== "number" || payload.exportScale <= 0) {
            return NextResponse.json(
                { error: "exportScale must be a positive number" },
                { status: 400 },
            );
        }
    }

    if (payload.exportPadding !== undefined) {
        if (typeof payload.exportPadding !== "number" || payload.exportPadding < 0) {
            return NextResponse.json(
                { error: "exportPadding must be a non-negative number" },
                { status: 400 },
            );
        }
    }

    if (payload.maxSize !== undefined) {
        if (typeof payload.maxSize !== "number" || payload.maxSize <= 0) {
            return NextResponse.json(
                { error: "maxSize must be a positive number" },
                { status: 400 },
            );
        }
    }

    if (payload.quality !== undefined) {
        if (
            typeof payload.quality !== "number"
            || payload.quality <= 0
            || payload.quality > 1
        ) {
            return NextResponse.json(
                { error: "quality must be a number between 0 and 1" },
                { status: 400 },
            );
        }
    }

    if (payload.backgroundColor !== undefined) {
        if (typeof payload.backgroundColor !== "string") {
            return NextResponse.json(
                { error: "backgroundColor must be a string" },
                { status: 400 },
            );
        }
    }

    let elements: unknown[] = [];
    let files: Record<string, unknown> = {};

    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const originalWindow = (globalThis as any).window;
    const originalDocument = (globalThis as any).document;
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

    try {
        const getNumericAttr = (el: Element, name: string, fallback = 0) => {
            const raw = el.getAttribute?.(name);
            if (!raw) {
                return fallback;
            }
            const value = Number.parseFloat(raw);
            return Number.isFinite(value) ? value : fallback;
        };

        const getStyleFontSize = (el: Element, fallback = 16) => {
            const style = el.getAttribute?.("style");
            if (!style) {
                return fallback;
            }
            const match = style.match(/font-size\s*:\s*([0-9.]+)px/i);
            if (!match) {
                return fallback;
            }
            const value = Number.parseFloat(match[1]);
            return Number.isFinite(value) ? value : fallback;
        };

        const computeBBox = (el: Element): DOMRect => {
            const tag = el.tagName?.toLowerCase?.() ?? "";
            if (tag === "text" || tag === "tspan") {
                const fontSize =
                    getNumericAttr(el, "font-size", NaN) || getStyleFontSize(el, 16);
                const text = el.textContent ?? "";
                const width = Math.max(0, text.length) * fontSize * 0.6;
                const height = fontSize;
                return {
                    x: getNumericAttr(el, "x", 0),
                    y: getNumericAttr(el, "y", 0) - height,
                    width,
                    height,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    toJSON: () => ({}),
                } as DOMRect;
            }

            if (tag === "rect" || tag === "image") {
                const width = getNumericAttr(el, "width", 0);
                const height = getNumericAttr(el, "height", 0);
                return {
                    x: getNumericAttr(el, "x", 0),
                    y: getNumericAttr(el, "y", 0),
                    width,
                    height,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    toJSON: () => ({}),
                } as DOMRect;
            }

            if (tag === "circle") {
                const r = getNumericAttr(el, "r", 0);
                const cx = getNumericAttr(el, "cx", 0);
                const cy = getNumericAttr(el, "cy", 0);
                return {
                    x: cx - r,
                    y: cy - r,
                    width: r * 2,
                    height: r * 2,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    toJSON: () => ({}),
                } as DOMRect;
            }

            if (tag === "ellipse") {
                const rx = getNumericAttr(el, "rx", 0);
                const ry = getNumericAttr(el, "ry", 0);
                const cx = getNumericAttr(el, "cx", 0);
                const cy = getNumericAttr(el, "cy", 0);
                return {
                    x: cx - rx,
                    y: cy - ry,
                    width: rx * 2,
                    height: ry * 2,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    toJSON: () => ({}),
                } as DOMRect;
            }

            if (tag === "line") {
                const x1 = getNumericAttr(el, "x1", 0);
                const y1 = getNumericAttr(el, "y1", 0);
                const x2 = getNumericAttr(el, "x2", 0);
                const y2 = getNumericAttr(el, "y2", 0);
                const minX = Math.min(x1, x2);
                const minY = Math.min(y1, y2);
                const maxX = Math.max(x1, x2);
                const maxY = Math.max(y1, y2);
                return {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    toJSON: () => ({}),
                } as DOMRect;
            }

            if (el.childNodes && (el.childNodes as any).length) {
                let minX = Number.POSITIVE_INFINITY;
                let minY = Number.POSITIVE_INFINITY;
                let maxX = Number.NEGATIVE_INFINITY;
                let maxY = Number.NEGATIVE_INFINITY;
                const children = Array.from(el.childNodes) as Element[];
                for (const child of children) {
                    if (!(child as any).getBBox) {
                        continue;
                    }
                    const box = (child as any).getBBox();
                    if (!box) {
                        continue;
                    }
                    minX = Math.min(minX, box.x);
                    minY = Math.min(minY, box.y);
                    maxX = Math.max(maxX, box.x + box.width);
                    maxY = Math.max(maxY, box.y + box.height);
                }

                if (Number.isFinite(minX) && Number.isFinite(minY)) {
                    return {
                        x: minX,
                        y: minY,
                        width: maxX - minX,
                        height: maxY - minY,
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        toJSON: () => ({}),
                    } as DOMRect;
                }
            }

            return {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                toJSON: () => ({}),
            } as DOMRect;
        };

        const getBBoxPolyfill = function (this: Element) {
            return computeBBox(this);
        };

        if (dom.window.SVGElement?.prototype) {
            dom.window.SVGElement.prototype.getBBox = getBBoxPolyfill as any;
        }

        if (dom.window.SVGGraphicsElement?.prototype) {
            dom.window.SVGGraphicsElement.prototype.getBBox = getBBoxPolyfill as any;
        }

        if ((dom.window as any).SVGTextContentElement?.prototype) {
            (dom.window as any).SVGTextContentElement.prototype.getBBox = getBBoxPolyfill as any;
        }

        if ((dom.window as any).SVGTextElement?.prototype) {
            (dom.window as any).SVGTextElement.prototype.getBBox = getBBoxPolyfill as any;
        }

        if (dom.window.Element?.prototype) {
            dom.window.Element.prototype.getBBox = getBBoxPolyfill as any;
        }

        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            enumerable: true,
            writable: true,
            value: dom.window.navigator,
        });

        const { parseMermaidToExcalidraw } = await import(
            "@excalidraw/mermaid-to-excalidraw"
        );

        const result = await parseMermaidToExcalidraw(
            payload.mermaid,
            payload.config ?? {},
        );
        elements = result.elements;
        files = result.files ?? {};
    } catch (error) {
        const message = error instanceof Error ? error.message : "Mermaid parse failed";
        return NextResponse.json({ error: message }, { status: 400 });
    } finally {
        if (originalWindow === undefined) {
            delete (globalThis as any).window;
        } else {
            (globalThis as any).window = originalWindow;
        }

        if (originalDocument === undefined) {
            delete (globalThis as any).document;
        } else {
            (globalThis as any).document = originalDocument;
        }

        if (navigatorDescriptor) {
            Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
        } else {
            delete (globalThis as any).navigator;
        }
    }

    const browser = await getBrowser();
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
        pageErrors.push(error.message);
    });

    try {
        await page.setContent(
            "<!doctype html><html><head><meta charset=\"utf-8\" /></head><body><div id=\"root\"></div></body></html>",
            { waitUntil: "domcontentloaded" },
        );
        await page.addScriptTag({ content: fs.readFileSync(reactPath, "utf-8") });
        await page.evaluate(() => {
            if (!(window as any).React) {
                throw new Error("React global not available");
            }
        });

        await page.addScriptTag({ content: fs.readFileSync(reactDomPath, "utf-8") });
        await page.evaluate(() => {
            if (!(window as any).ReactDOM) {
                throw new Error("ReactDOM global not available");
            }
        });

        await page.evaluate(() => {
            const w = window as any;
            if (!w.ReactJSXRuntime && w.React) {
                w.ReactJSXRuntime = {
                    jsx: w.React.createElement,
                    jsxs: w.React.createElement,
                    Fragment: w.React.Fragment,
                };
                if (w.self) {
                    w.self.ReactJSXRuntime = w.ReactJSXRuntime;
                }
                if (w.globalThis) {
                    w.globalThis.ReactJSXRuntime = w.ReactJSXRuntime;
                }
            }
        });
        await page.addScriptTag({ content: fs.readFileSync(excalidrawPath, "utf-8") });
        await page.evaluate(() => {
            if (!(window as any).ExcalidrawLib) {
                throw new Error("ExcalidrawLib global not available");
            }
        });

        const bytes = await page.evaluate(
            async (data) => {
                const lib = (window as unknown as { ExcalidrawLib?: any }).ExcalidrawLib;
                if (!lib?.exportToBlob) {
                    throw new Error("Excalidraw export library not available");
                }

                const exportOptions: Record<string, unknown> = {
                    elements: data.elements,
                    appState: {
                        exportWithDarkMode: data.darkMode ?? false,
                        viewBackgroundColor: data.backgroundColor ?? "#ffffff",
                    },
                    files: data.files ?? {},
                    mimeType: "image/png",
                };

                if (data.maxSize !== undefined) {
                    exportOptions.maxWidthOrHeight = data.maxSize;
                }

                if (data.quality !== undefined) {
                    exportOptions.quality = data.quality;
                }

                if (data.exportScale !== undefined) {
                    const scale = data.exportScale;
                    exportOptions.getDimensions = (width: number, height: number) => ({
                        width: width * scale,
                        height: height * scale,
                        scale,
                    });
                }

                if (data.exportPadding !== undefined) {
                    exportOptions.exportPadding = data.exportPadding;
                }

                const blob = await lib.exportToBlob(exportOptions);
                const buffer = await blob.arrayBuffer();
                return Array.from(new Uint8Array(buffer));
            },
            {
                elements,
                files,
                exportScale: payload.exportScale,
                exportPadding: payload.exportPadding,
                maxSize: payload.maxSize,
                quality: payload.quality,
                backgroundColor: payload.backgroundColor,
                darkMode: payload.darkMode,
            },
        );

        return new NextResponse(Buffer.from(bytes), {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Render failed";
        const detail = pageErrors.length > 0 ? ` | Page errors: ${pageErrors.join(" | ")}` : "";
        return NextResponse.json({ error: `${message}${detail}` }, { status: 500 });
    } finally {
        await page.close();
    }
}
