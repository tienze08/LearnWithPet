import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { Card, Japanese, Kicker, PRIMARY, SECONDARY } from "@/components/practice/ui";
import { getSentence, needsReview, score, setResult, type Progress } from "@/lib/practice-progress";
import type { Grammar } from "@/lib/sentence-practice";

type Props = {
  grammar: Grammar;
  progress: Progress;
  onChange: (progress: Progress) => void;
  onList: () => void;
};

export function Result({ grammar, progress, onChange, onList }: Props) {
  const [copyLabel, setCopyLabel] = useState("Sao chép kết quả");
  const practice = score(progress, "practice");
  const check = score(progress, "check");
  const pending = progress.answers.filter((a) => a.result === null);
  const review = needsReview(progress);

  const report = [
    `Mẫu ${grammar.id} · ${new Date().toISOString().slice(0, 10)}`,
    `Luyện: ${practice.correct}/${practice.total} · Câu mới: ${check.correct}/${check.total}` +
      (check.pending ? ` (chưa chấm ${check.pending})` : ""),
    ...progress.answers
      .filter((a) => a.result !== "correct")
      .map((a) => `${a.id} ${a.result ?? "chưa chấm"} ${a.answer}`.trim()),
  ].join("\n");

  return (
    <div className="space-y-4">
      <Kicker>Kết quả · Bài {grammar.lesson}</Kicker>
      <h2 className="text-3xl font-extrabold">
        Câu mới: đúng {check.correct}/{check.total}
      </h2>
      <p className="text-sm text-muted-foreground">
        Luyện tập: đúng {practice.correct}/{practice.total}
      </p>

      {pending.map((a) => {
        const s = getSentence(a.id);
        return (
          <Card key={a.id}>
            <Kicker>Bạn tự chấm</Kicker>
            <Japanese ja={s.ja} kana={s.kana} />
            <p className="text-sm">Bạn viết: {a.answer}</p>
            <p className="font-extrabold">Đáp án: {s.vi}</p>
            <button
              type="button"
              className={SECONDARY}
              onClick={() => onChange(setResult(progress, a.id, "correct"))}
            >
              Mình hiểu đúng
            </button>
            <button
              type="button"
              className={SECONDARY}
              onClick={() => onChange(setResult(progress, a.id, "wrong"))}
            >
              Mình hiểu sai
            </button>
          </Card>
        );
      })}

      {review.map((a) => {
        const s = getSentence(a.id);
        return (
          <Card key={a.id}>
            <Kicker>{a.result === "disputed" ? "Bạn cho là cũng đúng" : "Câu cần xem lại"}</Kicker>
            <p className="font-extrabold">{s.vi}</p>
            {a.answer && (
              <p className="text-sm">
                Bạn trả lời: <span lang={s.mode === "build" ? "ja" : "vi"}>{a.answer}</span>
              </p>
            )}
            <Japanese ja={s.ja} kana={s.kana} />
            {s.mode === "build" && a.result === "wrong" && (
              <button
                type="button"
                className={SECONDARY}
                onClick={() => onChange(setResult(progress, a.id, "disputed"))}
              >
                Câu của tôi cũng đúng?
              </button>
            )}
          </Card>
        );
      })}

      {pending.length === 0 && review.length > 0 && (
        <button
          type="button"
          className={PRIMARY}
          onClick={() => onChange({ ...progress, retry: review.map((a) => a.id) })}
        >
          Luyện lại câu sai
        </button>
      )}
      <button type="button" className={SECONDARY} onClick={onList}>
        Chọn mẫu khác
      </button>
      <Link to="/app" className={`${SECONDARY} flex items-center justify-center`}>
        Về trang chủ
      </Link>

      <details className="rounded-2xl border-2 border-border bg-card p-4">
        <summary className="cursor-pointer font-bold">Gửi kết quả cho người tổ chức thử</summary>
        <textarea
          readOnly
          aria-label="Kết quả"
          className="my-3 h-32 w-full rounded-xl border-2 border-border bg-background p-2 text-sm"
          value={report}
        />
        <button
          type="button"
          className={SECONDARY}
          onClick={() =>
            navigator.clipboard
              .writeText(report)
              .then(() => setCopyLabel("Đã chép"))
              .catch(() => setCopyLabel("Hãy chép từ ô trên"))
          }
        >
          {copyLabel}
        </button>
      </details>
    </div>
  );
}
