import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderCard } from "@/components/learning-path/ExerciseCards";
import { QuestionCard } from "@/components/learning-path/QuestionCard";
import type { TranslateItem } from "@/lib/japanese/practice";
import type { OrderExercise, Question } from "@/lib/learning-path/questions";
import { TranslateCard } from "./TranslateCard";

export type DrillItem = Question | OrderExercise | TranslateItem;

const groupOf = (item: DrillItem) =>
  item.kind === "translate"
    ? item.direction === "ja-vi"
      ? "Dịch Nhật → Việt"
      : "Dịch Việt → Nhật"
    : item.kind.startsWith("vocab")
      ? "Từ vựng"
      : "Ngữ pháp";

/** Runs one session of exercises. `make` is called on every start, so a retry can draw new items. */
export function DrillRunner({ make, intro }: { make: () => DrillItem[]; intro: React.ReactNode }) {
  // null = not started. `run` remounts the cards on a retry.
  const [items, setItems] = useState<DrillItem[] | null>(null);
  const [at, setAt] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [run, setRun] = useState(0);

  const start = () => {
    setItems(make());
    setAt(0);
    setResults([]);
    setRun(run + 1);
  };

  if (!items || at >= items.length) {
    const groups = [...new Set(items?.map(groupOf))];
    return (
      <div className="space-y-3 rounded-2xl bg-surface-2 p-4">
        {!items ? (
          <div className="text-sm">{intro}</div>
        ) : items.length === 0 ? (
          <p role="status" className="text-sm">
            Chưa có câu nào cho lựa chọn này.
          </p>
        ) : (
          <div role="status" className="space-y-1">
            <p className="text-base font-bold">
              Đúng {results.filter(Boolean).length}/{items.length} câu
            </p>
            {groups.length > 1 && (
              <ul className="text-sm">
                {groups.map((g) => {
                  const mine = items.flatMap((x, i) => (groupOf(x) === g ? [results[i]] : []));
                  return (
                    <li key={g}>
                      {g}: {mine.filter(Boolean).length}/{mine.length}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        <Button type="button" onClick={start}>
          {items ? "Làm lại" : "Bắt đầu"}
        </Button>
      </div>
    );
  }

  const item = items[at];
  const card = {
    onAnswer: (ok: boolean) =>
      setResults((r) => {
        const next = [...r];
        next[at] = ok;
        return next;
      }),
    // Not a functional update: a double "next" (Enter on the focused button) must not skip a question.
    onNext: () => setAt(at + 1),
  };
  const key = `${run}:${at}`;
  const nextLabel = at === items.length - 1 ? "Xem kết quả" : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          Câu {at + 1}/{items.length}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setItems(null)}>
          Dừng
        </Button>
      </div>
      {item.kind === "translate" ? (
        <TranslateCard key={key} {...card} item={item} nextLabel={nextLabel} />
      ) : "type" in item ? (
        <OrderCard key={key} {...card} ex={item} />
      ) : (
        <QuestionCard key={key} {...card} q={item} nextLabel={nextLabel} />
      )}
    </div>
  );
}
