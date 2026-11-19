import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadAllStrokes } from "@/data/kanji";
import { labelOf } from "@/lib/japanese/kanji-map/detail";
import { buildIndex, recognize, type KanjiIndex, type Match, type Pt } from "@/lib/japanese/kanji-map/recognize";

// The index is built once per page load, on first use. Everything runs in the browser; strokes never leave it.
let indexPromise: Promise<KanjiIndex> | null = null;
const getIndex = () =>
  (indexPromise ??= loadAllStrokes()
    .then(buildIndex)
    .catch((e) => {
      indexPromise = null;
      throw e;
    }));

const INK = "#1c1f1d";
const GUIDE = "rgba(0,0,0,0.08)";

/** Square drawing pad (mouse, touch, stylus) + recognition. Picking a result calls `onSelect`. */
export function HandwritingPad({ onSelect }: { onSelect: (char: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const live = useRef<Pt[] | null>(null);
  const [results, setResults] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const paint = useCallback((all: Pt[][]) => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(w * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = GUIDE;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, w);
    ctx.moveTo(0, w / 2);
    ctx.lineTo(w, w / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = Math.max(4, w / 40);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of all) {
      if (s.length === 1) {
        ctx.beginPath();
        ctx.arc(s[0].x, s[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      for (const p of s.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    paint(strokes);
  }, [strokes, paint]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paint(live.current ? [...strokes, live.current] : strokes));
    ro.observe(c);
    return () => ro.disconnect();
  }, [strokes, paint]);

  const at = (e: React.PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    live.current = [at(e)];
    setResults(null);
    paint([...strokes, live.current]);
  };
  const move = (e: React.PointerEvent) => {
    if (!live.current) return;
    live.current.push(at(e));
    paint([...strokes, live.current]);
  };
  const up = () => {
    const s = live.current;
    live.current = null;
    if (s) setStrokes((p) => [...p, s]);
  };

  const undo = () => {
    setStrokes((p) => p.slice(0, -1));
    setResults(null);
  };
  const clear = () => {
    setStrokes([]);
    setResults(null);
  };
  const run = async () => {
    setBusy(true);
    setError(false);
    try {
      const idx = await getIndex();
      setResults(recognize(strokes, idx, 12));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvas}
        aria-label="Vùng viết kanji bằng tay"
        role="img"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        className="aspect-square w-full max-w-72 cursor-crosshair touch-none select-none rounded-2xl bg-white ring-1 ring-border"
      />
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={undo} disabled={!strokes.length}>
          <Undo2 aria-hidden className="mr-1.5 h-4 w-4" />
          Hoàn tác
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!strokes.length}>
          <Eraser aria-hidden className="mr-1.5 h-4 w-4" />
          Xóa
        </Button>
        <Button type="button" size="sm" onClick={run} disabled={!strokes.length || busy}>
          {busy ? "Đang nhận diện…" : "Nhận diện Kanji"}
        </Button>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {strokes.length} nét. Viết từng nét riêng, càng đúng thứ tự càng chính xác. Nét viết chỉ xử lý trên máy bạn.
      </p>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            Không tải được dữ liệu nét. Thử lại sau.
          </p>
        )}
        {results && results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Không nhận diện được chữ này. Hãy xóa và viết lại rõ hơn, hoặc thử thêm nét còn thiếu.
          </p>
        )}
        {results && results.length > 0 && (
          <>
            <p className="mb-1 text-xs text-muted-foreground">Kết quả (độ phù hợp tương đối):</p>
            <ul className="grid grid-cols-3 gap-1.5">
              {results.map((m) => (
                <li key={m.char}>
                  <button
                    type="button"
                    onClick={() => onSelect(m.char)}
                    aria-label={`Mở kanji ${m.char}, độ phù hợp ${m.confidence}%`}
                    className="flex min-h-[4.5rem] w-full flex-col items-center justify-center rounded-xl bg-surface-2 px-1 transition-colors hover:bg-primary-soft"
                  >
                    <span lang="ja" className="jp-serif text-2xl leading-none">
                      {m.char}
                    </span>
                    <span className="mt-1 max-w-full truncate text-[11px] font-bold leading-none text-primary-ink">
                      {labelOf(m.char) ?? "—"}
                    </span>
                    <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">{m.confidence}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
