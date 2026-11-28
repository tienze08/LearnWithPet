import { DrillRunner } from "@/components/practice/DrillRunner";
import type { GrammarPoint } from "@/data/japanese/grammar";
import { translateItems, translateKey } from "@/lib/japanese/practice";
import { useTranslationRecords } from "@/lib/japanese/practice-progress";
import { buildSentences } from "@/lib/japanese/sentences";
import { grammarDrill } from "@/lib/learning-path/questions";

/**
 * The exercise set of one grammar point. Practice only: nothing is saved and it does not move Learning Path progress.
 */
export function GrammarExercises({ g, all }: { g: GrammarPoint; all: GrammarPoint[] }) {
  const count = grammarDrill(g, all).length;
  if (count === 0) return <p className="text-sm text-muted-foreground">Mẫu này chưa có bài tập.</p>;
  return (
    <DrillRunner
      make={() => grammarDrill(g, all)}
      intro={`${count} câu luyện tập cho mẫu này. Kết quả chưa được lưu.`}
    />
  );
}

/** Translation of this point's sentences in both directions, with its own saved progress. */
export function GrammarTranslation({ g }: { g: GrammarPoint }) {
  const records = useTranslationRecords();
  const items = translateItems(buildSentences([g]), ["ja-vi", "vi-ja"]);
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Mẫu này chưa có câu để dịch.</p>;
  const done = items.filter((i) => records[translateKey(i)]?.ok).length;
  return (
    <DrillRunner
      // Sentences not yet translated correctly come first.
      make={() =>
        [...items].sort(
          (a, b) => Number(!!records[translateKey(a)]?.ok) - Number(!!records[translateKey(b)]?.ok),
        )
      }
      intro={`Đã dịch đúng ${done}/${items.length} lượt (Nhật → Việt và Việt → Nhật). Lưu trên trình duyệt này.`}
    />
  );
}
