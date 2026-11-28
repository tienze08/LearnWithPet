import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DrillRunner, type DrillItem } from "@/components/practice/DrillRunner";
import { ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { loadAllGrammar } from "@/data/japanese/grammar";
import {
  useTangoLessonVocabulariesQuery,
  useTangoLevelWordsQuery,
} from "@/hooks/queries/tango.queries";
import { useMarks } from "@/lib/japanese/grammar/progress";
import { sample, translateItems, type Direction } from "@/lib/japanese/practice";
import { buildSentences } from "@/lib/japanese/sentences";
import { grammarDrill, vocabDrill } from "@/lib/learning-path/questions";

type Mode = "vocab" | "grammar" | "translate" | "mixed";
type Scope = "learned" | "all" | "custom";

const MODES: Record<Mode, { label: string; about: string }> = {
  vocab: { label: "Từ vựng", about: "Nghĩa, cách đọc, nghe và điền vào câu. 10 câu." },
  grammar: { label: "Ngữ pháp", about: "Chọn câu, chia động từ, điền chỗ trống, sắp xếp. 10 câu." },
  translate: { label: "Dịch câu", about: "Dịch Nhật ↔ Việt. 10 câu." },
  mixed: { label: "Tổng hợp", about: "5 câu từ vựng, 5 ngữ pháp, 5 Nhật → Việt, 5 Việt → Nhật." },
};

export const Route = createFileRoute("/app/practice")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode; lesson?: number } => ({
    mode:
      typeof search.mode === "string" && search.mode in MODES ? (search.mode as Mode) : undefined,
    lesson: typeof search.lesson === "number" && search.lesson > 0 ? search.lesson : undefined,
  }),
  component: PracticeCenter,
});

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="w-24 text-sm font-semibold text-muted-foreground">{label}</span>
      {options.map(([id, text]) => (
        <Button
          key={id}
          type="button"
          size="sm"
          variant={value === id ? "default" : "outline"}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {text}
        </Button>
      ))}
    </div>
  );
}

function PracticeCenter() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const mode = search.mode ?? "mixed";
  const [scope, setScope] = useState<Scope>("learned");
  const [direction, setDirection] = useState<Direction | "both">("both");
  const [custom, setCustom] = useState<string[]>([]);
  const marks = useMarks("learned");

  const grammar = useQuery({
    queryKey: ["grammar", "all"],
    queryFn: loadAllGrammar,
    staleTime: Infinity,
  });
  const words = useTangoLevelWordsQuery("N5");
  // Practising one lesson (from its page) uses all of that lesson's words.
  const lesson = useTangoLessonVocabulariesQuery(search.lesson ?? 0, !!search.lesson);

  const all = (grammar.data ?? []).filter((g) => g.level === "N5");
  const learnedWords = (words.data ?? []).filter((w) => w.viewed || w.status !== "NEW");
  const points =
    scope === "all"
      ? all
      : all.filter((g) => (scope === "learned" ? marks.has(g.id) : custom.includes(g.id)));
  const targets = search.lesson
    ? (lesson.data?.vocabularies ?? [])
    : scope === "learned"
      ? learnedWords
      : (words.data ?? []);
  const usesGrammar = mode !== "vocab";
  const usesWords = mode === "vocab" || mode === "mixed";

  const make = (): DrillItem[] => {
    const sentences = buildSentences(points);
    const vocab = (n: number) =>
      vocabDrill(sample(targets, n), words.data ?? [], buildSentences(all));
    const exercises = (n: number) =>
      sample(
        points.flatMap((g) => grammarDrill(g, all)),
        n,
      );
    const translate = (d: Direction, n: number) => sample(translateItems(sentences, [d]), n);
    if (mode === "vocab") return vocab(10);
    if (mode === "grammar") return exercises(10);
    if (mode === "translate")
      return direction === "both"
        ? [...translate("ja-vi", 5), ...translate("vi-ja", 5)]
        : translate(direction, 10);
    return [...vocab(5), ...exercises(5), ...translate("ja-vi", 5), ...translate("vi-ja", 5)];
  };

  const pending = grammar.isPending || words.isPending || (!!search.lesson && lesson.isPending);
  const failed = [grammar, words, ...(search.lesson ? [lesson] : [])].find((q) => q.isError);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Luyện tập</h1>
        <p className="text-sm text-muted-foreground">
          Vận dụng những gì đã học. Không ảnh hưởng tiến độ Learning Path.
        </p>
        <Link to="/app/listening" className="studio-link inline-flex min-h-11 items-center text-sm">
          Luyện nghe: hội thoại, điền từ, chép chính tả
        </Link>
        <br />
        <Link to="/app/shadowing" className="studio-link inline-flex min-h-11 items-center text-sm">
          Shadowing: nghe, nói theo và ghi âm
        </Link>
      </header>

      <Choice
        label="Dạng bài"
        value={mode}
        options={(Object.keys(MODES) as Mode[]).map((m) => [m, MODES[m].label])}
        onChange={(m) => navigate({ search: { mode: m } })}
      />
      {search.lesson ? (
        <p className="text-sm">
          Đang luyện từ của một bài.{" "}
          <Link
            to="/app/practice"
            search={{ mode }}
            className="font-bold text-primary hover:underline"
          >
            Bỏ giới hạn bài
          </Link>
        </p>
      ) : (
        <Choice
          label="Phạm vi"
          value={scope}
          options={[
            ["learned", "Đã học"],
            ["all", "Tất cả N5"],
            ...(usesGrammar ? [["custom", "Tự chọn ngữ pháp"] as [Scope, string]] : []),
          ]}
          onChange={setScope}
        />
      )}
      {mode === "translate" && (
        <Choice
          label="Chiều dịch"
          value={direction}
          options={[
            ["both", "Cả hai"],
            ["ja-vi", "Nhật → Việt"],
            ["vi-ja", "Việt → Nhật"],
          ]}
          onChange={setDirection}
        />
      )}

      {pending ? (
        <LoadingBlock rows={3} />
      ) : failed ? (
        <ErrorBlock error={failed.error} onRetry={() => failed.refetch()} />
      ) : (
        <>
          {scope === "custom" && usesGrammar && (
            <fieldset className="max-h-64 overflow-y-auto rounded-2xl bg-surface-2 p-3">
              <legend className="sr-only">Chọn mẫu ngữ pháp</legend>
              <div className="flex flex-wrap gap-1.5">
                {all.map((g) => (
                  <label
                    key={g.id}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-card px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={custom.includes(g.id)}
                      onChange={(e) =>
                        setCustom((c) =>
                          e.target.checked ? [...c, g.id] : c.filter((x) => x !== g.id),
                        )
                      }
                    />
                    <span lang="ja">{g.displayPattern}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <p className="text-sm text-muted-foreground">
            {[
              usesGrammar && `${points.length} mẫu ngữ pháp`,
              usesWords && `${targets.length} từ vựng`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {(usesGrammar && points.length === 0) || (usesWords && targets.length === 0) ? (
            <p role="status" className="rounded-2xl bg-surface-2 p-4 text-sm">
              {scope === "custom"
                ? "Hãy chọn ít nhất một mẫu ngữ pháp (phần từ vựng lấy mọi từ N5)."
                : "Chưa đủ nội dung đã học: đánh dấu “Đã học” ở trang ngữ pháp, học một bài từ vựng, hoặc chọn “Tất cả N5”."}
            </p>
          ) : (
            <DrillRunner
              // A changed setting ends the running session.
              key={`${mode}:${scope}:${direction}:${search.lesson ?? ""}:${custom.join()}`}
              make={make}
              intro={MODES[mode].about}
            />
          )}
        </>
      )}
    </div>
  );
}
