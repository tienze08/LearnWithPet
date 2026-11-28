import { useEffect, useState } from "react";
import { Check, Flag, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { reportQuestion } from "@/api/learning-path.api";
import { usePathStatusQuery } from "@/hooks/queries/learning-path.queries";
import type { Question } from "@/lib/learning-path/questions";
import { Companion } from "./studio";
import { speakKana } from "@/lib/japanese/kana";
import { JaText } from "./JaText";

/**
 * One multiple-choice question. Calls onAnswer once when an option is chosen, then onNext on "Tiếp tục".
 * Keys 1–4 choose, Enter continues.
 */
export function QuestionCard({
  q,
  onAnswer,
  onNext,
  nextLabel = "Tiếp tục",
}: {
  q: Question;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  // The pick belongs to one question: a new question starts unanswered in the same render (no reset effect to wait for,
  // so a fast Enter can never skip it). Keyed by identity because callers may rebuild an equal question object.
  const qKey = `${q.itemType}:${q.itemId}:${q.kind}`;
  const [pick, setPick] = useState<{ key: string; option: string } | null>(null);
  const chosen = pick?.key === qKey ? pick.option : null;
  const [reporting, setReporting] = useState(false);
  // Reports go to the Learning Path API, which answers 404 while the feature is off.
  const canReport = usePathStatusQuery().data?.enabled === true;

  const choose = (o: string) => {
    if (chosen !== null) return;
    setPick({ key: qKey, option: o });
    onAnswer(o === q.answer);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (reporting || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (chosen === null && n >= 1 && n <= q.options.length) choose(q.options[n - 1]);
      else if (chosen !== null && e.key === "Enter") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, chosen, reporting]);

  const right = chosen === q.answer;
  const glyph = q.stemLang === "ja" && q.stem.length <= 2;
  return (
    <div className="space-y-6">
      <div className="grid justify-items-center gap-4 text-center">
        <p className="text-sm leading-loose studio-muted">
          <JaText text={q.prompt} ruby={q.ruby} />
        </p>
        {glyph ? (
          // Single kana/kanji: set in a genkō cell, like a practice sheet.
          <div
            className="studio-genko w-36 sm:w-44"
            style={
              { "--genko-cols": 1, fontSize: "clamp(4.5rem, 14vw, 6.5rem)" } as React.CSSProperties
            }
          >
            <p lang="ja" className="!text-foreground">
              {q.stem}
            </p>
          </div>
        ) : (
          <p
            lang={q.stemLang}
            className={`w-full rounded-lg border border-border bg-sheet px-6 py-8 ${
              q.stemLang === "ja"
                ? "text-2xl leading-loose sm:text-3xl sm:leading-loose"
                : "studio-head text-2xl"
            }`}
          >
            <JaText text={q.stem} ruby={q.ruby} />
          </p>
        )}
        {q.speak && (
          <Button type="button" variant="outline" onClick={() => speakKana(q.speak!)}>
            <Volume2 aria-hidden className="mr-1.5 h-4 w-4" /> Nghe
          </Button>
        )}
        {q.hint && (
          <p className="text-sm leading-loose studio-muted">
            <JaText text={q.hint} ruby={q.ruby} />
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Các đáp án">
        {q.options.map((o, i) => {
          const isAnswer = chosen !== null && o === q.answer;
          const isWrongPick = chosen === o && !right;
          return (
            <button
              key={o}
              type="button"
              disabled={chosen !== null}
              onClick={() => choose(o)}
              lang={q.optionsLang}
              className={`flex min-h-14 items-center gap-3 rounded-[var(--radius)] border px-4 py-3 text-left transition-colors ${q.optionsLang === "ja" ? "text-xl" : "text-base"} ${
                isAnswer
                  ? "border-primary bg-primary-soft font-semibold"
                  : isWrongPick
                    ? "studio-shake border-seal bg-sheet text-seal-ink"
                    : "border-border bg-sheet hover:bg-primary-soft disabled:opacity-60 disabled:hover:bg-sheet"
              }`}
            >
              <kbd
                aria-hidden
                className="hidden min-w-6 rounded-[2px] border border-border px-1.5 text-center font-sans text-xs studio-muted sm:inline"
              >
                {i + 1}
              </kbd>
              <span className={`flex-1 ${q.ruby ? "leading-loose" : ""}`}>
                <JaText text={o} ruby={q.ruby} />
              </span>
              {isAnswer && <Check aria-hidden className="h-5 w-5 text-primary" />}
              {isWrongPick && <X aria-hidden className="h-5 w-5" />}
            </button>
          );
        })}
      </div>

      {chosen !== null && (
        <div
          role="status"
          className={`studio-rise sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
            right ? "border-primary bg-primary-soft" : "border-seal bg-sheet"
          }`}
        >
          <div className="flex items-center gap-3 text-sm">
            {/* The pet reacts: excited on a right answer, patiently waiting on a wrong one (never sad). */}
            <Companion size={36} mood={right ? "excited" : "waiting"} />
            <span>
              {right ? (
                <b>Đúng rồi.</b>
              ) : (
                <>
                  <b className="text-seal-ink">Chưa đúng, thử nhớ lại nhé.</b> Đáp án:{" "}
                  <b lang={q.optionsLang}>
                    <JaText text={q.answer} ruby={q.ruby} />
                  </b>
                </>
              )}
            </span>
          </div>
          <Button onClick={onNext}>
            {nextLabel} <span className="hidden text-xs opacity-70 sm:inline">Enter</span>
          </Button>
        </div>
      )}

      {canReport && (
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm studio-muted hover:text-foreground"
        >
          <Flag aria-hidden className="h-4 w-4" /> Báo câu hỏi sai
        </button>
      )}

      <ReportDialog q={q} open={reporting} onOpenChange={setReporting} />
    </div>
  );
}

function ReportDialog({
  q,
  open,
  onOpenChange,
}: {
  q: Question;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await reportQuestion({
        itemType: q.itemType,
        itemId: q.itemId,
        questionKind: q.kind,
        questionJson: JSON.stringify(q),
        comment: comment.trim(),
      });
      toast.success("Cảm ơn bạn! Câu hỏi đã được ghi nhận để kiểm tra.");
      setComment("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chưa gửi được báo cáo");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Báo câu hỏi sai</DialogTitle>
          <DialogDescription>
            Câu hỏi được tạo tự động. Cho mình biết điểm chưa đúng (không bắt buộc).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={comment}
          maxLength={500}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ví dụ: có hai đáp án đều đúng"
          aria-label="Ghi chú"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending ? "Đang gửi…" : "Gửi báo cáo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
