import { NextResponse } from "next/server";
import type { Browser } from "playwright";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

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

type RenderPayload = {
    elements: unknown[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
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
    let payload: RenderPayload;
    try {
        payload = (await request.json()) as RenderPayload;
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 },
        );
    }

    if (!payload?.elements || !Array.isArray(payload.elements)) {
        return NextResponse.json(
            { error: "Payload must include an elements array" },
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

        const bytes = await page.evaluate(async (data) => {
            const lib = (window as unknown as { ExcalidrawLib?: any }).ExcalidrawLib;
            if (!lib?.exportToBlob) {
                throw new Error("Excalidraw export library not available");
            }

            const exportOptions: Record<string, unknown> = {
                elements: data.elements,
                appState: {
                    exportWithDarkMode: data.darkMode ?? false,
                    viewBackgroundColor: data.backgroundColor ?? "#ffffff",
                    ...(data.appState ?? {}),
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
        }, payload);

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
