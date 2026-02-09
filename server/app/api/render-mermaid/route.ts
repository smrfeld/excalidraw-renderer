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

        await page.addScriptTag({
            type: "module",
            content: `
                import { parseMermaidToExcalidraw } from "https://esm.sh/@excalidraw/mermaid-to-excalidraw@1.1.4";
                window.__parseMermaidToExcalidraw = parseMermaidToExcalidraw;
            `,
        });

        await page.waitForFunction(
            () => typeof (window as any).__parseMermaidToExcalidraw === "function",
        );

        const bytes = await page.evaluate(
            async (data) => {
                const lib = (window as unknown as { ExcalidrawLib?: any }).ExcalidrawLib;
                if (!lib?.exportToBlob) {
                    throw new Error("Excalidraw export library not available");
                }
                const parseMermaidToExcalidraw =
                    (window as any).__parseMermaidToExcalidraw as (
                        mermaid: string,
                        config?: Record<string, unknown>,
                    ) => Promise<{ elements: unknown[]; files?: Record<string, unknown> }>;

                const defaultConfig: Record<string, unknown> = {
                    flowchart: {
                        htmlLabels: false,
                    },
                    class: {
                        htmlLabels: false,
                    },
                };

                const mergedConfig: Record<string, unknown> = {
                    ...defaultConfig,
                    ...(data.config ?? {}),
                    flowchart: {
                        ...(defaultConfig.flowchart as Record<string, unknown>),
                        ...((data.config as Record<string, unknown> | undefined)
                            ?.flowchart as Record<string, unknown> | undefined),
                    },
                    class: {
                        ...(defaultConfig.class as Record<string, unknown>),
                        ...((data.config as Record<string, unknown> | undefined)
                            ?.class as Record<string, unknown> | undefined),
                    },
                };

                const result = await parseMermaidToExcalidraw(
                    data.mermaid,
                    mergedConfig,
                );

                const makeId = () => Math.random().toString(36).slice(2, 10);
                const makeNonce = () => Math.floor(Math.random() * 2_147_483_647);

                const measureText = (text: string, fontSize: number) => {
                    const lines = text.split("\n");
                    const maxLine = lines.reduce(
                        (max, line) => Math.max(max, line.length),
                        0,
                    );
                    const width = maxLine * fontSize * 0.6;
                    const lineHeight = 1.25;
                    const height = lines.length * fontSize * lineHeight;
                    return { width, height, lineHeight };
                };

                const buildClassLabelMap = (source: string) => {
                    const map: Record<string, string> = {};
                    const lines = source.split(/\r?\n/);
                    let i = 0;

                    while (i < lines.length) {
                        const line = lines[i].trim();
                        if (!line.startsWith("class ")) {
                            i += 1;
                            continue;
                        }

                        const rest = line.slice(6).trim();
                        const braceIndex = rest.indexOf("{");

                        if (braceIndex === -1) {
                            const name = rest.split(/\s+/)[0];
                            if (name) {
                                map[name] = name;
                            }
                            i += 1;
                            continue;
                        }

                        const name = rest.slice(0, braceIndex).trim();
                        const members: string[] = [];
                        const after = rest.slice(braceIndex + 1).trim();
                        if (after && after !== "}") {
                            const inline = after.replace(/}\s*$/, "").trim();
                            if (inline) {
                                members.push(inline);
                            }
                        }

                        i += 1;
                        while (i < lines.length && !lines[i].includes("}")) {
                            const member = lines[i].trim();
                            if (member) {
                                members.push(member);
                            }
                            i += 1;
                        }

                        if (i < lines.length && lines[i].includes("}")) {
                            const tail = lines[i].split("}")[0].trim();
                            if (tail) {
                                members.push(tail);
                            }
                        }

                        if (name) {
                            const text = [name, ...members].join("\n").trim();
                            map[name] = text || name;
                        }

                        i += 1;
                    }

                    return map;
                };

                const withLabelsToText = (rawElements: any[], classLabelMap: Record<string, string>) => {
                    const elements: any[] = [];
                    const now = Date.now();

                    for (const element of rawElements) {
                        const label = element?.label;
                        let labelText = label?.text ? String(label.text).trim() : "";
                        if (!labelText) {
                            const key = element?.id ?? element?.metadata?.classId;
                            if (key && classLabelMap[key]) {
                                labelText = classLabelMap[key];
                            }
                        }

                        if (!labelText) {
                            elements.push(element);
                            continue;
                        }

                        const fontSize = label.fontSize ?? 20;
                        const text = labelText;
                        const { width, height, lineHeight } = measureText(text, fontSize);

                        const isClassLabel =
                            (element?.id && classLabelMap[element.id])
                            || (element?.metadata?.classId
                                && classLabelMap[element.metadata.classId]);
                        const padding = isClassLabel ? 8 : 4;
                        const elementX = element.x ?? 0;
                        const elementY = element.y ?? 0;
                        const elementWidth = element.width ?? 0;
                        const elementHeight = element.height ?? 0;
                        const cx = elementX + elementWidth / 2;
                        const cy = elementY + elementHeight / 2;
                        const x = isClassLabel ? elementX + padding : cx - width / 2;
                        const y = isClassLabel ? elementY + padding : cy - height / 2;
                        const textAlign = isClassLabel ? "left" : "center";
                        const verticalAlign = isClassLabel ? "top" : "middle";
                        const textElement = {
                            id: makeId(),
                            type: "text",
                            x,
                            y,
                            width,
                            height,
                            angle: element.angle ?? 0,
                            strokeColor: element.label?.strokeColor ?? element.strokeColor ?? "#1e1e1e",
                            backgroundColor: "transparent",
                            fillStyle: "solid",
                            strokeWidth: 1,
                            strokeStyle: "solid",
                            roughness: 0,
                            opacity: element.opacity ?? 100,
                            groupIds: label.groupIds ?? element.groupIds ?? [],
                            frameId: element.frameId ?? null,
                            roundness: null,
                            seed: makeNonce(),
                            version: 1,
                            versionNonce: makeNonce(),
                            isDeleted: false,
                            boundElements: null,
                            updated: now,
                            link: null,
                            locked: false,
                            text,
                            fontSize,
                            fontFamily: 1,
                            textAlign,
                            verticalAlign,
                            baseline: fontSize,
                            containerId: element.id ?? null,
                            originalText: text,
                            lineHeight,
                        };

                        if (element.id) {
                            const bound = Array.isArray(element.boundElements)
                                ? element.boundElements
                                : [];
                            bound.push({ id: textElement.id, type: "text" });
                            element.boundElements = bound;
                        }

                        delete element.label;
                        elements.push(element, textElement);
                    }

                    return elements;
                };

                const classLabelMap = buildClassLabelMap(data.mermaid);
                const elements = withLabelsToText(result.elements ?? [], classLabelMap);
                const files = result.files ?? {};

                const exportOptions: Record<string, unknown> = {
                    elements,
                    appState: {
                        exportWithDarkMode: data.darkMode ?? false,
                        viewBackgroundColor: data.backgroundColor ?? "#ffffff",
                    },
                    files,
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
                mermaid: payload.mermaid,
                config: payload.config ?? {},
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
