import { NextResponse } from "next/server";
import type { Browser } from "playwright";
import { chromium } from "playwright";
import { createRequire } from "module";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const require = createRequire(import.meta.url);
const excalidrawPath = require.resolve(
    "@excalidraw/excalidraw/dist/excalidraw.production.min.js",
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

    try {
        await page.setContent(
            "<!doctype html><html><head><meta charset=\"utf-8\" /></head><body><div id=\"root\"></div></body></html>",
            { waitUntil: "domcontentloaded" },
        );
        await page.addScriptTag({ path: excalidrawPath });

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
        return NextResponse.json({ error: message }, { status: 500 });
    } finally {
        await page.close();
    }
}
