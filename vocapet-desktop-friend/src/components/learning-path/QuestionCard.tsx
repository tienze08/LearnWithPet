import { useEffect, useState } from "react";
import { Check, Flag, X } from "lucide-react";
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
import type { Question } from "@/lib/learning-path/questions";

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
  const [chosen, setChosen] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  // Reset only when the question itself changes: callers may rebuild an equal question object on every render.
  const qKey = `${q.itemType}:${q.itemId}:${q.kind}`;
  useEffect(() => setChosen(null), [qKey]);

  const choose = (o: string) => {
    if (chosen !== null) return;
    setChosen(o);
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
  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-3xl bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-muted-foreground">{q.prompt}</p>
        <p
          lang={q.stemLang}
          className={
            q.stemLang === "ja"
              ? q.stem.length <= 2
                ? "jp-serif text-7xl font-bold"
                : "text-2xl font-semibold leading-relaxed"
              : "text-xl font-semibold"
          }
        >
          {q.stem}
        </p>
        {q.hint && <p className="text-sm text-muted-foreground">{q.hint}</p>}
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
              className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-semibold transition-colors ${
                isAnswer
                  ? "bg-primary text-primary-foreground"
                  : isWrongPick
                    ? "bg-destructive/15 text-destructive"
                    : "bg-surface-2 hover:bg-primary-soft disabled:hover:bg-surface-2"
              }`}
            >
              <span className="text-xs opacity-60">{i + 1}</span>
              <span className="flex-1">{o}</span>
              {isAnswer && <Check aria-hidden className="h-5 w-5" />}
              {isWrongPick && <X aria-hidden className="h-5 w-5" />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Flag aria-hidden className="h-4 w-4" /> Báo câu hỏi sai
        </button>
        {chosen !== null && (
          <div className="flex items-center gap-3">
            <p
              role="status"
              className={`text-sm font-bold ${right ? "text-primary" : "text-destructive"}`}
            >
              {right ? "Chính xác!" : `Đáp án đúng: ${q.answer}`}
            </p>
            <Button onClick={onNext}>{nextLabel}</Button>
          </div>
        )}
      </div>

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
