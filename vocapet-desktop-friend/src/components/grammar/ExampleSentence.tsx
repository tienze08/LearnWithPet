import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GrammarExample } from "@/data/japanese/grammar";
import { speakKana } from "@/lib/japanese/kana";
import { parseFurigana, readingOf } from "@/lib/japanese/grammar/furigana";
import { Ruby } from "@/components/kanji-map/Ruby";

/** One example: Japanese with furigana, Vietnamese translation, and a play button. English stays in the collapsed source block. */
export function ExampleSentence({ e, children }: { e: GrammarExample; children?: React.ReactNode }) {
  const text = e.furigana ? readingOf(e.furigana) : e.japanese;
  return (
    <li className="rounded-2xl bg-surface-2 p-3">
      {e.furigana ? (
        <Ruby segments={parseFurigana(e.furigana)} className="jp-serif block text-lg leading-loose" />
      ) : (
        <p lang="ja" className="jp-serif text-lg leading-loose">
          {e.japanese}
        </p>
      )}
      <p className="mt-1 text-sm">{e.meaningVi ?? <span className="text-muted-foreground">Chưa có bản dịch tiếng Việt</span>}</p>
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => speakKana(text)} aria-label={`Nghe câu: ${e.japanese}`}>
        <Volume2 aria-hidden className="mr-1.5 h-4 w-4" /> Nghe
      </Button>
      {children}
    </li>
  );
}
