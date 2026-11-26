import { useEffect, useRef, useState } from "react";

import { BuildCard, ReadCard } from "@/components/practice/Cards";
import { Result } from "@/components/practice/Result";
import { Card, Kicker, PRIMARY, SECONDARY } from "@/components/practice/ui";
import {
  getSentence,
  practiceCount,
  stageOf,
  type Progress,
  type Result as AnswerResult,
} from "@/lib/practice-progress";
import type { Grammar } from "@/lib/sentence-practice";

type Props = {
  grammar: Grammar;
  progress: Progress;
  onChange: (progress: Progress) => void;
  onExit: () => void;
};

/** Màn luyện toàn màn hình: che menu và thú cưng để người học tập trung. */
export function Session({ grammar, progress, onChange, onExit }: Props) {
  const [asking, setAsking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stage = stageOf(grammar.id, progress);
  const practice = practiceCount(grammar.id);
  const check = progress.queue.length - practice;
  const index = progress.answers.length;
  const sentenceId = stage === "retry" ? progress.retry[0] : progress.queue[index];
  const answering = stage === "practice" || stage === "check" || stage === "retry";

  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [stage, sentenceId]);

  const position = stage === "check" ? index - practice + 1 : index + 1;
  const total = stage === "check" ? check : practice;
  const counter = stage === "retry" ? `Còn ${progress.retry.length}` : `${position}/${total}`;

  const answer = (result: AnswerResult | null, text: string) => {
    if (stage === "retry") {
      // Luyện lại không thay đổi điểm của lượt đầu.
      onChange({ ...progress, retry: progress.retry.slice(1) });
    } else {
      onChange({
        ...progress,
        answers: [...progress.answers, { id: sentenceId, result, answer: text }],
      });
    }
  };

  const sentence = answering ? getSentence(sentenceId) : null;
  const CardView = sentence?.mode === "build" ? BuildCard : ReadCard;

  return (
    <div ref={scroller} className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto max-w-md space-y-4 p-5 pb-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Thoát bài luyện"
            className="h-11 w-11 shrink-0 rounded-xl border-2 border-border bg-card text-xl"
            onClick={() => (answering ? setAsking(true) : onExit())}
          >
            ×
          </button>
          {answering && (
            <>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${stage === "retry" ? 100 : ((position - 1) / total) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm font-extrabold">{counter}</span>
            </>
          )}
        </div>

        {sentence && (
          <>
            <Kicker>
              {stage === "check"
                ? "Kiểm tra · không gợi ý"
                : stage === "retry"
                  ? "Luyện lại câu sai"
                  : "Luyện tập"}
              {sentence.mode === "build" ? " · ghép câu" : " · đọc hiểu"}
            </Kicker>
            <CardView
              key={`${stage}-${sentence.id}-${progress.retry.length}`}
              sentence={sentence}
              feedback={stage !== "check"}
              onDone={answer}
            />
            {stage !== "check" && (
              <details key={sentence.id} className="rounded-2xl border-2 border-border bg-card p-4">
                <summary className="cursor-pointer font-bold">Xem lại mẫu</summary>
                <p className="mt-2 text-sm">{grammar.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{grammar.note}</p>
              </details>
            )}
          </>
        )}

        {stage === "gate" && (
          <>
            <Kicker>Xong phần luyện</Kicker>
            <h2 className="text-3xl font-extrabold">Giờ là {check} câu bạn chưa gặp</h2>
            <Card>
              <p>Không có gợi ý mẫu câu.</p>
              <p>Không báo đúng sai từng câu.</p>
              <p>Xem đáp án sau khi làm xong cả {check} câu.</p>
            </Card>
            <button
              type="button"
              className={PRIMARY}
              onClick={() => onChange({ ...progress, checkStarted: true })}
            >
              Bắt đầu kiểm tra
            </button>
            <button type="button" className={SECONDARY} onClick={onExit}>
              Để sau
            </button>
          </>
        )}

        {stage === "result" && (
          <Result grammar={grammar} progress={progress} onChange={onChange} onList={onExit} />
        )}
      </div>

      {asking && (
        <div className="fixed inset-0 flex items-end bg-black/45">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tạm dừng bài luyện"
            className="mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-popover p-5"
          >
            <h2 className="text-xl font-extrabold">Tạm dừng bài luyện?</h2>
            <p className="text-sm text-muted-foreground">
              Các câu đã trả lời được giữ trên trình duyệt này. Lần sau bạn làm tiếp.
            </p>
            <button type="button" autoFocus className={PRIMARY} onClick={() => setAsking(false)}>
              Làm tiếp
            </button>
            <button type="button" className={SECONDARY} onClick={onExit}>
              Thoát về danh sách
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
