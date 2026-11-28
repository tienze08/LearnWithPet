import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Ruby } from "@/components/kanji-map/Ruby";
import { gradeTranslation } from "@/api/translation.api";
import { useTangoLevelWordsQuery } from "@/hooks/queries/tango.queries";
import { parseFurigana } from "@/lib/japanese/grammar/furigana";
import {
  hintsFor,
  matchesJapanese,
  translateKey,
  type TranslateItem,
} from "@/lib/japanese/practice";
import { recordTranslation } from "@/lib/japanese/practice-progress";
import { AiFeedback } from "./AiFeedback";

/**
 * Translate one sentence. An exact Japanese match is marked right at once; anything else shows the reference and
 * the learner (or the AI) decides. Calls onAnswer once per card.
 */
export function TranslateCard({
  item,
  onAnswer,
  onNext,
  nextLabel = "Tiếp tục",
}: {
  item: TranslateItem;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  const { sentence: s, direction } = item;
  const toJapanese = direction === "vi-ja";
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const words = useTangoLevelWordsQuery(s.level).data ?? [];
  const hints = hintsFor(s, words);

  const settle = (ok: boolean, note?: string) => {
    if (result !== null) return;
    setResult(ok);
    recordTranslation(translateKey(item), ok, answer.trim(), note);
    onAnswer(ok);
  };

  const ai = useMutation({
    mutationFn: () =>
      gradeTranslation({
        direction: toJapanese ? "VI_JA" : "JA_VI",
        source: toJapanese ? s.meaningVi! : s.japanese,
        reference: toJapanese ? s.japanese : s.meaningVi!,
        answer: answer.trim(),
      }),
    onSuccess: (r) => settle(r.verdict !== "INCORRECT", r.explanation),
  });

  const check = () => {
    setRevealed(true);
    if (toJapanese && matchesJapanese(answer, s)) settle(true);
  };

  const japanese = s.furigana ? (
    <Ruby segments={parseFurigana(s.furigana)} />
  ) : (
    <span lang="ja">{s.japanese}</span>
  );

  return (
    <div className="space-y-4">
      <p className="text-center text-sm studio-muted">
        {toJapanese ? "Dịch sang tiếng Nhật" : "Dịch sang tiếng Việt"}
      </p>
      <p className="rounded-lg border border-border bg-sheet px-5 py-6 text-center text-2xl leading-loose">
        {toJapanese ? s.meaningVi : japanese}
      </p>

      {hints.length > 0 && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={showHint}
            onClick={() => setShowHint((v) => !v)}
          >
            {showHint ? "Ẩn gợi ý từ vựng" : "Gợi ý từ vựng"}
          </Button>
          {showHint && (
            <ul className="flex flex-wrap gap-2">
              {hints.map((h) => (
                <li key={h.word} className="rounded-xl bg-surface-2 px-3 py-1.5 text-sm">
                  <b lang="ja">{h.word}</b>
                  {h.reading && <span lang="ja"> ({h.reading})</span>}
                  {h.meaning && <span className="text-muted-foreground"> · {h.meaning}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Textarea
        value={answer}
        maxLength={300}
        disabled={revealed}
        lang={toJapanese ? "ja" : "vi"}
        onChange={(e) => setAnswer(e.target.value)}
        aria-label="Câu trả lời của bạn"
        placeholder={toJapanese ? "Viết bằng Kanji hoặc hiragana" : "Viết bản dịch của bạn"}
      />

      {!revealed ? (
        <Button type="button" onClick={check}>
          {answer.trim() ? "Kiểm tra" : "Xem đáp án"}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-primary bg-primary-soft p-4">
            <p className="text-xs font-semibold text-muted-foreground">Đáp án tham khảo</p>
            <p className="text-lg leading-loose">{toJapanese ? japanese : s.meaningVi}</p>
            {s.translation === "draft" && (
              <p className="text-xs text-muted-foreground">Bản dịch tiếng Việt còn là bản nháp.</p>
            )}
          </div>
          {ai.data && <AiFeedback result={ai.data} />}
          {ai.isError && (
            <p role="alert" className="text-sm text-destructive">
              {ai.error.message}
            </p>
          )}
          {result === null ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={ai.isPending} onClick={() => settle(true)}>
                Mình làm đúng
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={ai.isPending}
                onClick={() => settle(false)}
              >
                Chưa đúng
              </Button>
              {answer.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={ai.isPending}
                  onClick={() => ai.mutate()}
                >
                  {ai.isPending ? "AI đang chấm…" : "Nhờ AI chấm"}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="text-sm font-bold">
                {result ? "Đã ghi: đúng" : "Đã ghi: cần ôn lại"}
              </p>
              <Button type="button" onClick={onNext}>
                {nextLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
