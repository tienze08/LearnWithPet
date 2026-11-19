import { useCallback, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getTangoVocabulary } from "@/api/tango.api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTangoSearchQuery } from "@/hooks/queries/tango.queries";
import { loadKanjiGraph } from "@/data/kanji";
import { buildDetail, type TangoExampleRef, type TangoWordRef } from "@/lib/japanese/kanji-map/detail";
import { KanjiExplorer } from "./KanjiExplorer";
import { KanjiNetwork } from "./KanjiNetwork";
import { KanjiPanel } from "./KanjiPanel";
import { useWide } from "./useWide";

export const DEFAULT_KANJI = "夕";

/** Explorer + kanji network + detail panel for one selected kanji. */
export function KanjiMapPage({ char, onSelectKanji }: { char: string; onSelectKanji: (c: string) => void }) {
  const graphQuery = useQuery({ queryKey: ["kanji", "graph"], queryFn: loadKanjiGraph, staleTime: Infinity });
  const graph = graphQuery.data;
  const center = graph?.kanji[char] ? char : DEFAULT_KANJI;
  const wide = useWide();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Real Tango words containing this kanji, and one example sentence for the first few of them.
  const tango = useTangoSearchQuery(center);
  const words: TangoWordRef[] = useMemo(
    () =>
      (tango.data?.vocabularies ?? [])
        .filter((w) => w.expression?.includes(center))
        .map((w) => ({ id: w.vocabularyId, expression: w.expression!, kana: w.kana, meaning: w.primaryMeaning })),
    [tango.data, center],
  );
  const exampleQueries = useQueries({
    queries: words.slice(0, 4).map((w) => ({ queryKey: ["tango", "vocabulary", w.id], queryFn: () => getTangoVocabulary(w.id) })),
  });
  const examples: TangoExampleRef[] = useMemo(
    () =>
      exampleQueries.flatMap((q, i) =>
        (q.data?.examples ?? []).slice(0, 1).map((e) => ({ word: words[i].expression, japanese: e.japanese, reading: e.reading ?? null, vietnamese: e.vietnamese })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exampleQueries.map((q) => q.dataUpdatedAt).join(","), words],
  );
  const detail = useMemo(() => (graph ? buildDetail(center, graph, words, examples) : null), [graph, center, words, examples]);

  const open = useCallback((c: string) => onSelectKanji(c), [onSelectKanji]);
  const panel = graph && detail ? <KanjiPanel detail={detail} graph={graph} onOpenKanji={open} /> : null;

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[560px] flex-col gap-3">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Kanji</h1>
        <p className="text-sm text-muted-foreground">Chọn một kanji. Bấm vào chữ trên bản đồ để chuyển sang chữ đó; kéo để di chuyển, cuộn để phóng to.</p>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-cols-[248px_1fr] lg:grid-rows-1">
        <KanjiExplorer selected={center} onSelect={onSelectKanji} graph={graph} />
        <div className="grid min-h-0 min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1fr_360px]">
          <div className="min-h-0 min-w-0">
            {graph ? (
              <KanjiNetwork center={center} graph={graph} onOpen={open} onShowDetail={() => setSheetOpen(true)} showDetailButton={!wide} />
            ) : graphQuery.isError ? (
              <p role="alert" className="rounded-3xl bg-surface-2 p-6 text-sm">Không tải được dữ liệu kanji.</p>
            ) : (
              <div className="h-full animate-pulse rounded-3xl bg-surface-2" aria-busy="true" aria-label="Đang tải dữ liệu kanji" />
            )}
          </div>
          {wide && (
            <aside aria-label="Chi tiết kanji" className="min-h-0 overflow-auto rounded-3xl bg-card p-5">
              {panel}
            </aside>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Dữ liệu kanji: KANJIDIC2 và KRADFILE (EDRDG), KanjiVG (Ulrich Apel), CC BY-SA; Hán Việt: Unicode Unihan.{" "}
        <Link to="/app/japanese/kanji-sources" className="font-semibold text-primary hover:underline">xem chi tiết</Link>
      </p>

      {!wide && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-auto rounded-t-3xl">
            <SheetHeader><SheetTitle className="sr-only">Chi tiết kanji {center}</SheetTitle></SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
