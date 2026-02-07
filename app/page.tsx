"use client";

import dynamic from "next/dynamic";
import { exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { useEffect, useMemo, useState } from "react";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false },
);

type DrawingFile = {
  elements: ExcalidrawElement[];
};

export default function Home() {
  const [elements, setElements] = useState<ExcalidrawElement[] | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/example_drawing.json", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to load drawing: ${response.status}`);
        }
        const data = (await response.json()) as DrawingFile;
        if (!cancelled) {
          setElements(data.elements ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load drawing");
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!elements || elements.length === 0) {
      return;
    }

    let cancelled = false;

    const generateImage = async () => {
      const blob = await exportToBlob({
        elements,
        appState: {
          exportWithDarkMode: false,
          viewBackgroundColor: "#ffffff",
        },
        files: {},
        mimeType: "image/png",
      });

      if (cancelled) {
        return;
      }

      const url = URL.createObjectURL(blob);
      setImageUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return url;
      });
    };

    generateImage();

    return () => {
      cancelled = true;
      setImageUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return null;
      });
    };
  }, [elements]);

  const initialData = useMemo(() => {
    if (!elements) {
      return null;
    }
    return {
      elements,
      appState: {
        viewBackgroundColor: "#ffffff",
      },
    };
  }, [elements]);

  return (
    <div className="page">
      <div className="canvas-pane">
        {error && <p className="status error">{error}</p>}
        {!error && !initialData && <p className="status">Loading drawing…</p>}
        {!error && initialData && (
          <div className="excalidraw-root">
            <Excalidraw initialData={initialData} />
          </div>
        )}
      </div>
      <div className="export-pane">
        <h2>Exported PNG</h2>
        {!imageUrl && <p className="status">Rendering preview…</p>}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Exported Excalidraw diagram"
            className="export-image"
          />
        )}
      </div>
    </div>
  );
}
