import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrammarDetail } from "@/components/grammar/GrammarDetail";
import { KanjiPanel } from "@/components/kanji-map/KanjiPanel";
import { JpText, LoadingBlock } from "@/components/tango/shared";
import { loadKanjiGraph } from "@/data/kanji";
import { buildDetail } from "@/lib/japanese/kanji-map/detail";
import { speakKana } from "@/lib/japanese/kana";
import type { PathItemType } from "@/api/learning-path.api";
import type { PathContent } from "@/lib/learning-path/content";

/** The existing study view for one new item: the Grammar detail page, the Kanji panel, or a word card. */
export function ItemLesson({
  type,
  id,
  content,
}: {
  type: PathItemType;
  id: string;
  content: PathContent;
}) {
  if (type === "GRAMMAR") {
    const g = content.grammar.get(id);
    return g ? (
      <GrammarDetail g={g} related={[]} sameForm={[]} sameTopic={[]} prev={null} next={null} />
    ) : (
      <Missing />
    );
  }
  if (type === "KANJI") return <KanjiLesson char={id} content={content} />;
  return <VocabLesson id={id} content={content} />;
}

function Missing() {
  return <p className="text-sm text-muted-foreground">Không tìm thấy nội dung này.</p>;
}

function KanjiLesson({ char, content }: { char: string; content: PathContent }) {
  const navigate = useNavigate();
  const graph = useQuery({
    queryKey: ["kanji", "graph"],
    queryFn: loadKanjiGraph,
    staleTime: Infinity,
  });
  const detail = useMemo(
    () => (graph.data ? buildDetail(char, graph.data) : null),
    [graph.data, char],
  );
  if (graph.isLoading) return <LoadingBlock rows={3} />;
  if (graph.data && detail)
    return (
      <KanjiPanel
        detail={detail}
        graph={graph.data}
        onOpenKanji={(c) => navigate({ to: "/app/japanese/kanji", search: { k: c } })}
      />
    );
  // Graph unavailable: fall back to the N5 seed entry.
  const k = content.kanji.get(char);
  if (!k) return <Missing />;
  return (
    <div className="space-y-2 rounded-3xl bg-card p-6 text-center">
      <JpText serif as="p" className="text-8xl font-bold">
        {k.char}
      </JpText>
      <p className="font-bold">
        {k.hanViet} · {k.meaning}
      </p>
      <p lang="ja" className="text-sm text-muted-foreground">
        On: {k.on.join("、") || "—"} · Kun: {k.kun.join("、") || "—"}
      </p>
    </div>
  );
}

function VocabLesson({ id, content }: { id: string; content: PathContent }) {
  const v = content.vocab.get(id);
  if (!v) return <Missing />;
  return (
    <div className="space-y-4 rounded-3xl bg-card p-8 text-center shadow-sm">
      <JpText serif as="p" className="text-5xl font-bold">
        {v.word}
      </JpText>
      {v.kana !== v.word && (
        <JpText as="p" className="text-lg text-muted-foreground">
          {v.kana}
        </JpText>
      )}
      <p className="text-sm text-muted-foreground">{v.romaji}</p>
      <p className="text-xl font-bold">{v.meaning}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={() => speakKana(v.kana)}>
          <Volume2 aria-hidden className="mr-1.5 h-4 w-4" /> Nghe
        </Button>
        <Button variant="outline" asChild>
          <Link to="/app/japanese/tango/vocabularies/$vocabularyId" params={{ vocabularyId: v.id }}>
            Xem chi tiết từ
          </Link>
        </Button>
      </div>
    </div>
  );
}
