import { NextResponse } from "next/server";
import type { Browser } from "playwright";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const nodeModulesRoot = path.join(process.cwd(), "node_modules");
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

            const blob = await lib.exportToBlob({
                elements: data.elements,
                appState: {
                    exportWithDarkMode: false,
                    viewBackgroundColor: "#ffffff",
                    ...(data.appState ?? {}),
                },
                files: data.files ?? {},
                mimeType: "image/png",
            });

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
