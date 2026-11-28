import { useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchExercise, OrderExercise } from "@/lib/learning-path/questions";
import { JaText } from "./JaText";

type ItemResult = { itemId: string; correct: boolean };

/**
 * Match each word to its meaning. Tap a word, then a meaning. A word counts as correct only when its first pick
 * was right; a wrong pick flashes and the word stays open.
 */
export function MatchCard({
  ex,
  onDone,
}: {
  ex: MatchExercise;
  onDone: (results: ItemResult[]) => void;
}) {
  const rights = useMemo(
    () => [...ex.pairs].sort((a, b) => a.right.localeCompare(b.right, "vi")),
    [ex],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);
  const finished = matched.size === ex.pairs.length;

  const choose = (rightOf: string) => {
    if (!picked || matched.has(rightOf)) return;
    if (rightOf === picked) {
      setMatched((m) => new Set(m).add(picked));
      setPicked(null);
    } else {
      setMissed((m) => new Set(m).add(picked));
      setFlash(rightOf);
      setTimeout(() => setFlash(null), 500);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-sheet p-5 text-center">
        <p className="text-sm font-semibold text-muted-foreground">Ghép mỗi từ với nghĩa của nó</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2" role="group" aria-label="Từ">
          {ex.pairs.map((p) => (
            <button
              key={p.itemId}
              type="button"
              lang="ja"
              disabled={matched.has(p.itemId)}
              aria-pressed={picked === p.itemId}
              onClick={() => setPicked(p.itemId)}
              className={`flex min-h-14 w-full items-center justify-center rounded-[var(--radius)] px-3 text-lg font-semibold transition-colors ${
                matched.has(p.itemId)
                  ? "border border-primary bg-primary-soft text-primary"
                  : picked === p.itemId
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-sheet hover:bg-primary-soft"
              }`}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="space-y-2" role="group" aria-label="Nghĩa">
          {rights.map((p) => (
            <button
              key={p.itemId}
              type="button"
              disabled={matched.has(p.itemId) || !picked}
              onClick={() => choose(p.itemId)}
              className={`flex min-h-14 w-full items-center justify-center rounded-[var(--radius)] px-3 text-sm font-semibold transition-colors ${
                matched.has(p.itemId)
                  ? "border border-primary bg-primary-soft text-primary"
                  : flash === p.itemId
                    ? "studio-shake border border-seal bg-sheet text-seal-ink"
                    : "border border-border bg-sheet hover:bg-primary-soft disabled:hover:bg-sheet"
              }`}
            >
              {p.right}
            </button>
          ))}
        </div>
      </div>
      {finished && (
        <div className="flex items-center justify-between gap-3">
          <p role="status" className="text-sm font-bold text-primary">
            {missed.size === 0
              ? "Chính xác hết!"
              : `Đúng ngay lần đầu ${ex.pairs.length - missed.size}/${ex.pairs.length}`}
          </p>
          <Button
            onClick={() =>
              onDone(ex.pairs.map((p) => ({ itemId: p.itemId, correct: !missed.has(p.itemId) })))
            }
          >
            Tiếp tục
          </Button>
        </div>
      )}
    </div>
  );
}

/** Tap the pieces in order to build the sentence, then check. */
export function OrderCard({
  ex,
  onAnswer,
  onNext,
}: {
  ex: OrderExercise;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}) {
  const [chosen, setChosen] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const built = chosen.map((i) => ex.chunks[i]);

  const check = () => {
    const ok = built.join("") === ex.answer.join("");
    setChecked(ok);
    onAnswer(ok);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-lg border border-border bg-sheet p-6 text-center">
        <p className="text-sm font-semibold text-muted-foreground">Sắp xếp thành câu đúng</p>
        {ex.hint && <p className="text-sm text-muted-foreground">{ex.hint}</p>}
        <div
          lang="ja"
          aria-live="polite"
          className="flex min-h-14 flex-wrap items-center justify-center gap-2 rounded-[var(--radius)] bg-surface-2 p-3 text-xl"
        >
          {built.length === 0 ? (
            <span className="text-sm text-muted-foreground">Chạm vào các mảnh bên dưới</span>
          ) : (
            built.map((c, i) => (
              <button
                key={i}
                type="button"
                disabled={checked !== null}
                onClick={() => setChosen((s) => s.filter((_, j) => j !== i))}
                className="rounded-[var(--radius)] bg-card px-3 py-1.5 font-semibold"
              >
                <JaText text={c} ruby={ex.ruby} />
              </button>
            ))
          )}
        </div>
      </div>
      <div
        lang="ja"
        className="flex flex-wrap justify-center gap-2"
        role="group"
        aria-label="Các mảnh câu"
      >
        {ex.chunks.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={chosen.includes(i) || checked !== null}
            onClick={() => setChosen((s) => [...s, i])}
            className="min-h-12 rounded-[var(--radius)] border border-border bg-sheet px-4 text-lg font-semibold transition-colors hover:bg-primary-soft disabled:opacity-40"
          >
            <JaText text={c} ruby={ex.ruby} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {checked === null ? (
          <>
            <Button variant="ghost" disabled={chosen.length === 0} onClick={() => setChosen([])}>
              <RotateCcw aria-hidden className="mr-1.5 h-4 w-4" /> Làm lại
            </Button>
            <Button disabled={chosen.length !== ex.chunks.length} onClick={check}>
              Kiểm tra
            </Button>
          </>
        ) : (
          <>
            <p
              role="status"
              className={`flex items-center gap-1.5 text-sm font-bold ${checked ? "text-primary" : "text-destructive"}`}
            >
              {checked ? (
                <Check aria-hidden className="h-4 w-4" />
              ) : (
                <X aria-hidden className="h-4 w-4" />
              )}
              {checked ? (
                "Chính xác!"
              ) : (
                <span lang="ja" className="leading-loose">
                  Đúng là:{" "}
                  {ex.answer.map((c) => (
                    <JaText key={c} text={c} ruby={ex.ruby} />
                  ))}
                </span>
              )}
            </p>
            <Button onClick={onNext}>Tiếp tục</Button>
          </>
        )}
      </div>
    </div>
  );
}
