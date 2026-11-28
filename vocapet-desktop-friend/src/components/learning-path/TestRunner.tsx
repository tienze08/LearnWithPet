import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ErrorBlock, ProgressBar } from "@/components/tango/shared";
import {
  skipPathRetake,
  submitPathTest,
  type PathItemType,
  type TestView,
} from "@/api/learning-path.api";
import type { PathContent } from "@/lib/learning-path/content";
import { QuestionCard } from "./QuestionCard";

type Answer = { itemType: PathItemType; itemId: string; correct: boolean };
const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);

/**
 * End-of-day / weekly test. One question per item; answers are sent together when the attempt ends.
 * Below 80% the learner sees the wrong answers, then may retake once or skip the retake. Either way the day counts.
 */
export function TestRunner({
  items,
  weekly,
  test,
  content,
  onFinished,
  submit = submitPathTest,
  title,
}: {
  items: { itemType: PathItemType; itemId: string }[];
  weekly: boolean;
  test: TestView | null;
  content: PathContent;
  onFinished: () => void;
  /** Where answers go; defaults to today's test. A lesson's own check has no retake (canRetake is false). */
  submit?: (attempt: 1 | 2, answers: Answer[]) => Promise<TestView>;
  title?: string;
}) {
  const qc = useQueryClient();
  const [result, setResult] = useState<TestView | null>(test);
  const [running, setRunning] = useState(test == null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [index, setIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const attempt: 1 | 2 = result?.attempt1Score == null ? 1 : 2;

  const questions = useMemo(
    () =>
      items
        .map((i, n) => content.testQuestion(i.itemType, i.itemId, n))
        .filter((q): q is NonNullable<typeof q> => q !== null),
    [items, content],
  );
  const name = title ?? (weekly ? "Kiểm tra tuần" : "Kiểm tra cuối ngày");

  const send = async (all: Answer[]) => {
    setSending(true);
    setError(null);
    try {
      const r = await submit(attempt, all);
      setResult(r);
      setRunning(false);
      qc.invalidateQueries({ queryKey: ["path"] });
    } catch (e) {
      setError(e);
    } finally {
      setSending(false);
    }
  };
  const skip = async () => {
    setSending(true);
    try {
      setResult(await skipPathRetake());
      qc.invalidateQueries({ queryKey: ["path"] });
    } catch (e) {
      setError(e);
    } finally {
      setSending(false);
    }
  };

  if (running) {
    const q = questions[index];
    if (!q) {
      return (
        <div className="space-y-3 rounded-lg border border-border bg-sheet p-6 text-center">
          <p className="font-bold">{sending ? "Đang chấm bài…" : "Đã trả lời hết"}</p>
          {error != null && <ErrorBlock error={error} onRetry={() => send(answers)} />}
          {!sending && error == null && <Button onClick={() => send(answers)}>Nộp bài</Button>}
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>
              Câu {index + 1} / {questions.length}
            </span>
            <span className="text-muted-foreground">
              {attempt === 2 ? `${name} · làm lại` : name}
            </span>
          </div>
          <ProgressBar
            value={Math.round((index / Math.max(1, questions.length)) * 100)}
            label="Tiến độ bài kiểm tra"
          />
        </div>
        <QuestionCard
          q={q}
          nextLabel={index === questions.length - 1 ? "Nộp bài" : "Câu tiếp"}
          onAnswer={(correct) =>
            setAnswers((a) => [...a, { itemType: q.itemType, itemId: q.itemId, correct }])
          }
          onNext={() => {
            // onNext runs after onAnswer re-rendered, so `answers` already holds the last answer.
            if (index === questions.length - 1) send(answers);
            setIndex((i) => i + 1);
          }}
        />
      </div>
    );
  }

  if (!result) return null;
  const over = result.finalScore != null;
  return (
    <div className="space-y-5">
      <div
        className={`space-y-2 rounded-lg border border-border p-6 text-center ${over && result.passed ? "bg-primary-soft" : "bg-surface-2"}`}
      >
        <p className="text-sm font-semibold text-muted-foreground">{name}</p>
        <p className="studio-head text-6xl tabular-nums">
          {pct(over ? result.finalScore : result.attempt1Score)}
        </p>
        <p className="text-sm text-muted-foreground">
          Lần 1: {pct(result.attempt1Score)}
          {result.attempt2Score != null && ` · Lần 2: ${pct(result.attempt2Score)}`}
          {over && ` · Kết quả: ${pct(result.finalScore)}`}
        </p>
        {result.message && <p className="font-semibold">{result.message}</p>}
      </div>

      {result.wrongItems.length > 0 && (
        <section aria-labelledby="wrong" className="space-y-2">
          <h2 id="wrong" className="font-bold">
            Câu sai cần xem lại
          </h2>
          <ul className="divide-y divide-border/70 rounded-[var(--radius)] bg-card">
            {result.wrongItems.map((w) => {
              const d = content.describe(w.type, w.id);
              return (
                <li key={`${w.type}:${w.id}`} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span lang="ja" className="min-w-12 text-lg font-bold">
                    {d.title}
                  </span>
                  <span className="text-sm text-muted-foreground">{d.detail}</span>
                  <span className="ml-auto text-xs font-semibold text-ochre">Yếu</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {error != null && <ErrorBlock error={error} />}
      <div className="flex flex-wrap gap-2">
        {result.canRetake ? (
          <>
            <Button
              disabled={sending}
              onClick={() => {
                setAnswers([]);
                setIndex(0);
                setRunning(true);
              }}
            >
              Làm lại một lần
            </Button>
            <Button variant="outline" disabled={sending} onClick={skip}>
              Bỏ qua, kết thúc
            </Button>
          </>
        ) : (
          over && <Button onClick={onFinished}>Tiếp tục</Button>
        )}
      </div>
    </div>
  );
}
