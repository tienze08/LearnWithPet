import { useMemo, useState } from "react";
import { AlertCircle, Check, Circle, CircleDot, PenLine, Search, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { HandwritingPad } from "./HandwritingPad";
import type { KanjiGraphData } from "@/data/kanji";
import { buildItems, LEVEL_FILTERS, matchesLevel, searchItems, type KanjiItem, type LevelFilter } from "@/lib/japanese/kanji-map/list";
import { getKanjiStatus, KANJI_STATUS_LABEL, type KanjiStatus } from "@/lib/japanese/kanji-progress";

const STATUS_ICON = { NEW: Circle, LEARNING: CircleDot, MASTERED: Check, NEED_REVIEW: AlertCircle } as const;
const STATUS_CLASS: Record<KanjiStatus, string> = {
  NEW: "text-muted-foreground",
  LEARNING: "text-info",
  MASTERED: "text-primary",
  NEED_REVIEW: "text-warning-ink",
};

const PAGE = 120; // tiles rendered at once; "Hiện thêm" reveals more

const NO_DATA = "Chưa có dữ liệu";

/** Search + level/status filters and a compact grid. Vertical grid on lg, horizontal strip below. Default scope: the N5 kanji VocaPet teaches. */
export function KanjiExplorer({ selected, onSelect, graph }: { selected: string; onSelect: (char: string) => void; graph?: KanjiGraphData }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<LevelFilter>("N5");
  const [status, setStatus] = useState<KanjiStatus | "ALL">("ALL");
  const [limit, setLimit] = useState(PAGE);
  const [mode, setMode] = useState<"text" | "draw">("text");

  const all = useMemo(() => (graph ? buildItems(graph) : []), [graph]);
  const hasStatus = useMemo(() => all.some((k) => getKanjiStatus(k.char) !== null), [all]);
  const results = useMemo(
    () => searchItems(query, all).filter((k) => matchesLevel(k, level) && (status === "ALL" || getKanjiStatus(k.char) === status)),
    [all, query, level, status],
  );

  return (
    <section aria-label="Danh sách kanji" className="flex min-h-0 min-w-0 flex-col gap-2">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1" role="group" aria-label="Cách tìm kanji">
        <Chip active={mode === "text"} onClick={() => setMode("text")}><Type aria-hidden className="mr-1 inline h-3.5 w-3.5" />Nhập chữ</Chip>
        <Chip active={mode === "draw"} onClick={() => setMode("draw")}><PenLine aria-hidden className="mr-1 inline h-3.5 w-3.5" />Viết tay</Chip>
      </div>

      {mode === "draw" ? (
        <div className="min-h-0 overflow-y-auto"><HandwritingPad onSelect={onSelect} /></div>
      ) : (
      <>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Tìm kanji theo chữ, Hán Việt, nghĩa, cách đọc hoặc tiếng Anh"
          placeholder="Chữ, Hán Việt, nghĩa, cách đọc, tiếng Anh"
          className="pl-9"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Bộ lọc cấp độ">
        {LEVEL_FILTERS.map((l) => <Chip key={l.id} active={level === l.id} onClick={() => { setLevel(l.id); setLimit(PAGE); }}>{l.label}</Chip>)}
      </div>
      {hasStatus && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Bộ lọc trạng thái">
          {(["ALL", "NEW", "LEARNING", "MASTERED", "NEED_REVIEW"] as const).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s === "ALL" ? "Mọi trạng thái" : KANJI_STATUS_LABEL[s]}</Chip>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-snug text-muted-foreground">Cấp N quy đổi từ thang JLPT cũ (KANJIDIC2), chỉ để tham khảo, không phải phân loại chính thức.</p>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {graph ? `${results.length}/${all.length} kanji` : "Đang tải…"}
      </p>

      {!graph ? null : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {level === "N1" && !query.trim() ? "N1: chưa có dữ liệu." : `Không tìm thấy kanji phù hợp.${level !== "ALL" ? " Thử chọn “Tất cả” để tìm trong mọi kanji." : ""}`}
        </p>
      ) : (
        <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:content-start lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0 lg:pr-1">
          {results.slice(0, limit).map((k) => (
            <li key={k.char} className="shrink-0 lg:shrink">
              <Tile kanji={k} active={k.char === selected} onSelect={onSelect} />
            </li>
          ))}
          {results.length > limit && (
            <li className="shrink-0 lg:col-span-3">
              <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="min-h-11 w-full rounded-xl bg-surface-2 px-3 text-xs font-semibold hover:bg-primary-soft">
                Hiện thêm ({results.length - limit})
              </button>
            </li>
          )}
        </ul>
      )}
      </>
      )}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-8 rounded-full px-3 text-xs font-semibold transition-colors ${active ? "bg-primary-soft text-primary-ink" : "bg-surface-2 hover:bg-primary-soft"}`}
    >
      {children}
    </button>
  );
}

function Tile({ kanji, active, onSelect }: { kanji: KanjiItem; active: boolean; onSelect: (c: string) => void }) {
  const status = getKanjiStatus(kanji.char);
  const Icon = status ? STATUS_ICON[status] : null;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${kanji.char}, ${kanji.hanViet[0] ?? NO_DATA}, ${kanji.meaningVi ?? NO_DATA}${status ? `, ${KANJI_STATUS_LABEL[status]}` : ""}`}
      onClick={() => onSelect(kanji.char)}
      className={`relative flex h-11 min-w-11 flex-col items-center justify-center rounded-xl transition-[background,transform] duration-200 lg:h-[5.25rem] lg:w-full lg:hover:-translate-y-px ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "bg-surface-2 hover:bg-primary-soft"
      }`}
    >
      <span lang="ja" className="jp-serif text-xl leading-none lg:text-2xl">{kanji.char}</span>
      <span className={`mt-1 hidden max-w-full truncate px-1 text-[11px] font-bold leading-none lg:block ${active ? "" : "text-primary-ink"}`}>
        {kanji.hanViet[0] ?? "—"}
      </span>
      <span className={`mt-0.5 hidden max-w-full truncate px-1 text-[11px] leading-none lg:block ${active ? "opacity-90" : "text-muted-foreground"}`}>
        {kanji.meaningVi ?? "—"}
      </span>
      {Icon && status && (
        <Icon aria-hidden className={`absolute right-1 top-1 h-3 w-3 ${active ? "text-primary-foreground" : STATUS_CLASS[status]}`} />
      )}
    </button>
  );
}
