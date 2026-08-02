import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2, Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type PdfDocument = { title: string; text: string; file: File; importedHighlights: string[] };
type Props = { onLoaded: (document: PdfDocument) => void };

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjs;
}

export function PdfReaderLoader({ onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function loadPdf(file: File) {
    setLoading(true);
    try {
      const pdfjs = await loadPdfJs();
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, index) => {
          const page = await pdf.getPage(index + 1);
          const content = await page.getTextContent();
          const annotations = await page.getAnnotations();
          return {
            text: content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
            highlights: extractAnnotationText(content.items, annotations),
          };
        }),
      );

      onLoaded({
        title: file.name.replace(/\.pdf$/i, ""),
        text: pages.map((page) => page.text).join("\n\n"),
        file,
        importedHighlights: [...new Set(pages.flatMap((page) => page.highlights))],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="rounded-xl border-2 font-bold"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-2" />
        )}
        {loading ? "Opening PDF…" : "Upload PDF"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void loadPdf(file);
          event.target.value = "";
        }}
      />
    </>
  );
}

type AnnotationTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

function isAnnotationTextItem(item: unknown): item is AnnotationTextItem {
  return typeof item === "object" && item !== null && "str" in item;
}

function extractAnnotationText(items: Array<unknown>, annotations: Array<any>) {
  const terms: string[] = [];
  for (const annotation of annotations.filter((item) => item.subtype === "Highlight")) {
    const contents = typeof annotation.contents === "string" ? annotation.contents.trim() : "";
    if (contents) {
      terms.push(contents);
      continue;
    }
    const points = annotation.quadPoints as number[] | undefined;
    if (!points?.length) continue;
    const boxes = Array.from({ length: Math.floor(points.length / 8) }, (_, index) => {
      const quad = points.slice(index * 8, index * 8 + 8);
      return { left: Math.min(quad[0], quad[2], quad[4], quad[6]), right: Math.max(quad[0], quad[2], quad[4], quad[6]), bottom: Math.min(quad[1], quad[3], quad[5], quad[7]), top: Math.max(quad[1], quad[3], quad[5], quad[7]) };
    });
    const text = items
      .filter(isAnnotationTextItem)
      .filter((item) => item.str && item.transform)
      .filter((item) => {
        const x = item.transform![4];
        const y = item.transform![5];
        const width = item.width ?? 0;
        const height = Math.max(item.height ?? 0, Math.abs(item.transform![3] ?? 0));
        return boxes.some((box) => x <= box.right && x + width >= box.left && y + height >= box.bottom && y - height <= box.top);
      })
      .map((item) => item.str)
      .join(" ")
      .trim();
    if (text) terms.push(text);
  }
  return terms.flatMap((term) => term.match(/[\p{L}][\p{L}'-]*/gu) ?? []).map((term) => term.toLocaleLowerCase());
}

export function PdfDocumentViewer({
  file,
  onTextSelected,
  basketWords,
  learnedWords,
}: {
  file: File;
  onTextSelected: (event: { clientX?: number; clientY?: number; fromPdf?: boolean }) => void;
  basketWords: string[];
  learnedWords: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const pageSurfaceRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerWidth, setViewerWidth] = useState(0);
  const [pageWidthPercent, setPageWidthPercent] = useState(100);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const basketWordsKey = basketWords
    .map((word) => word.toLocaleLowerCase())
    .sort()
    .join("|");
  const learnedWordsKey = learnedWords
    .map((word) => word.toLocaleLowerCase())
    .sort()
    .join("|");

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const updateWidth = () => setViewerWidth(viewer.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncFocusMode = () => setIsFocusMode(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", syncFocusMode);
    return () => document.removeEventListener("fullscreenchange", syncFocusMode);
  }, []);

  async function enterFocusMode() {
    if (containerRef.current?.requestFullscreen && !document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    }
  }

  useEffect(() => {
    setPageNumber(1);
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    setPageCount(0);
    setError(null);

    async function renderPage() {
      setLoading(true);
      try {
        const pdfjs = await loadPdfJs();
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);
        const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = viewerWidth
          ? Math.min(
              1.5,
              Math.max(0.4, ((viewerWidth - 24) * pageWidthPercent) / 100 / baseViewport.width),
            )
          : 1;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        const pageSurface = pageSurfaceRef.current;
        const textLayer = textLayerRef.current;
        if (!canvas || !context || !pageSurface || !textLayer || cancelled) return;

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        pageSurface.style.width = `${Math.ceil(viewport.width)}px`;
        pageSurface.style.height = `${Math.ceil(viewport.height)}px`;
        pageSurface.style.setProperty("--scale-factor", String(viewport.scale));
        pageSurface.style.setProperty("--total-scale-factor", String(viewport.scale));
        textLayer.replaceChildren();
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (cancelled) return;

        const textContent = await page.getTextContent();
        const layer = new pdfjs.TextLayer({
          textContentSource: textContent,
          container: textLayer,
          viewport,
        });
        await layer.render();
        applyHighlights(textLayer, basketWordsKey, learnedWordsKey);
      } catch {
        if (!cancelled) setError("This PDF could not be displayed. Please try another file.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [file, pageNumber, viewerWidth, pageWidthPercent]);

  useEffect(() => {
    if (textLayerRef.current)
      applyHighlights(textLayerRef.current, basketWordsKey, learnedWordsKey);
  }, [basketWordsKey, learnedWordsKey]);

  return (
    <section ref={containerRef} className={`overflow-hidden border-2 border-border bg-muted/20 ${isFocusMode ? "h-screen rounded-none" : "rounded-2xl"}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-3 py-2">
        <p className="truncate text-xs font-bold text-muted-foreground">{file.name}</p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={pageWidthPercent <= 60 || loading}
            onClick={() => setPageWidthPercent((size) => Math.max(60, size - 10))}
            aria-label="Decrease PDF size"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-9 text-center text-xs font-bold">{pageWidthPercent}%</span>
          <Button
            variant="ghost"
            size="icon"
            disabled={pageWidthPercent >= 100 || loading}
            onClick={() => setPageWidthPercent((size) => Math.min(100, size + 10))}
            aria-label="Increase PDF size"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => isFocusMode ? void document.exitFullscreen() : void enterFocusMode()} aria-label={isFocusMode ? "Exit focus mode" : "Open focus mode"}>
            {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={pageNumber <= 1 || loading}
            onClick={() => setPageNumber((page) => page - 1)}
            aria-label="Previous PDF page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-bold">
            {pageCount ? `${pageNumber} / ${pageCount}` : "Loading"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={loading || !pageCount || pageNumber >= pageCount}
            onClick={() => setPageNumber((page) => page + 1)}
            aria-label="Next PDF page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={viewerRef}
        className={`relative overflow-x-hidden overflow-y-auto bg-slate-200 p-3 ${isFocusMode ? "h-[calc(100vh-54px)]" : "max-h-[70vh]"}`}
      >
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-card/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {error ? (
          <p className="p-8 text-center text-sm text-destructive">{error}</p>
        ) : (
          <div ref={pageSurfaceRef} className="relative mx-auto bg-white shadow-sm">
            <canvas ref={canvasRef} className="absolute inset-0 block" />
            <div
              ref={textLayerRef}
              className="pdf-text-layer"
              onMouseUp={(event) =>
                onTextSelected({ clientX: event.clientX, clientY: event.clientY, fromPdf: true })
              }
              onTouchEnd={(event) => {
                const touch = event.changedTouches[0];
                onTextSelected({ clientX: touch?.clientX, clientY: touch?.clientY, fromPdf: true });
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyHighlights(
  textLayer: HTMLDivElement,
  basketWordsKey: string,
  learnedWordsKey: string,
) {
  const basketTerms = basketWordsKey.split("|").filter(Boolean);
  const learnedTerms = learnedWordsKey
    .split("|")
    .filter((term) => term && !basketTerms.includes(term));
  const basketRanges: Range[] = [];
  const learnedRanges: Range[] = [];
  textLayer.querySelectorAll("span").forEach((span) => {
    span.classList.remove("pdf-saved-text");
    const textNode = span.firstChild;
    const value = textNode?.textContent ?? "";
    if (textNode?.nodeType !== Node.TEXT_NODE) return;

    for (const term of basketTerms) {
      const expression = new RegExp(`\\b${escapeRegExp(term)}\\b`, "giu");
      for (const match of value.matchAll(expression)) {
        const range = document.createRange();
        range.setStart(textNode, match.index ?? 0);
        range.setEnd(textNode, (match.index ?? 0) + match[0].length);
        basketRanges.push(range);
      }
    }
    for (const term of learnedTerms) {
      const expression = new RegExp(`\\b${escapeRegExp(term)}\\b`, "giu");
      for (const match of value.matchAll(expression)) {
        const range = document.createRange();
        range.setStart(textNode, match.index ?? 0);
        range.setEnd(textNode, (match.index ?? 0) + match[0].length);
        learnedRanges.push(range);
      }
    }
  });

  const cssHighlights = (CSS as typeof CSS & { highlights?: Map<string, unknown> }).highlights;
  if (cssHighlights && "Highlight" in window) {
    const Highlight = (window as Window & { Highlight: new (...ranges: Range[]) => unknown })
      .Highlight;
    cssHighlights.set("vocapet-basket", new Highlight(...basketRanges));
    cssHighlights.set("vocapet-learned", new Highlight(...learnedRanges));
  }
}
