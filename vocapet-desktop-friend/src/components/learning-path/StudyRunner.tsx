import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/tango/shared";
import type { PathItemType } from "@/api/learning-path.api";
import type { PathContent } from "@/lib/learning-path/content";
import { usePathAnswerMutation } from "@/hooks/queries/learning-path.queries";
import { ItemLesson } from "./ItemLesson";
import { QuestionCard } from "./QuestionCard";

export interface RunnerItem {
  itemType: PathItemType;
  itemId: string;
  done: boolean;
}

const keyOf = (i: { itemType: string; itemId: string }) => `${i.itemType}:${i.itemId}`;

/**
 * Walks a list of items: lesson then questions for new items, questions only for reviews. Items already done
 * (per the server) are skipped, so leaving midway resumes at the first unfinished item.
 * An item counts as correct only when every one of its questions is answered correctly.
 */
export function StudyRunner({
  items,
  review,
  content,
  onFinished,
}: {
  items: RunnerItem[];
  review: boolean;
  content: PathContent;
  onFinished: () => void;
}) {
  const answer = usePathAnswerMutation();
  const [finished, setFinished] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.done).map(keyOf)),
  );
  const queue = items.filter((i) => !finished.has(keyOf(i)));
  const current = queue[0];
  const [phase, setPhase] = useState<"lesson" | "quiz">(review ? "quiz" : "lesson");
  const [qIndex, setQIndex] = useState(0);
  const allRight = useRef(true);

  const questions = useMemo(
    () => (current ? content.questionsFor(current.itemType, current.itemId) : []),
    [current, content],
  );

  if (!current) {
    return (
      <div className="space-y-4 rounded-3xl bg-primary-soft p-8 text-center">
        <p className="text-xl font-bold text-primary-ink">Xong phần này rồi!</p>
        <Button onClick={onFinished}>Tiếp tục</Button>
      </div>
    );
  }

  const done = items.length - queue.length;
  const record = (correct: boolean, kind: string) =>
    answer.mutate({
      itemType: current.itemType,
      itemId: current.itemId,
      correct,
      review,
      questionKind: kind,
    });

  const advanceItem = () => {
    setFinished((s) => new Set(s).add(keyOf(current)));
    setPhase(review ? "quiz" : "lesson");
    setQIndex(0);
    allRight.current = true;
  };

  const header = (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-bold">
        <span>
          {done + 1} / {items.length}
        </span>
        <span className="text-muted-foreground">
          {review ? "Ôn tập" : phase === "lesson" ? "Bài mới" : "Luyện tập"}
        </span>
      </div>
      <ProgressBar
        value={Math.round((done / Math.max(1, items.length)) * 100)}
        label="Tiến độ khối học"
      />
    </div>
  );

  if (phase === "lesson") {
    return (
      <div className="space-y-6">
        {header}
        <ItemLesson type={current.itemType} id={current.itemId} content={content} />
        <div className="sticky bottom-20 flex justify-end md:bottom-4">
          <Button size="lg" onClick={() => setPhase("quiz")}>
            Đã hiểu, làm bài tập
          </Button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    // No question could be built (too little data for distractors): accept the lesson as seen, graded as correct.
    return (
      <div className="space-y-6">
        {header}
        <p className="text-sm text-muted-foreground">Chưa tạo được bài tập cho nội dung này.</p>
        <Button
          onClick={() => {
            record(true, "no-question");
            advanceItem();
          }}
        >
          Tiếp tục
        </Button>
      </div>
    );
  }

  const q = questions[qIndex];
  const last = qIndex === questions.length - 1;
  return (
    <div className="space-y-6">
      {header}
      <QuestionCard
        q={q}
        nextLabel={last ? "Tiếp tục" : "Câu tiếp"}
        onAnswer={(correct) => {
          allRight.current &&= correct;
          if (last) record(allRight.current, questions.map((x) => x.kind).join("+"));
        }}
        onNext={() => (last ? advanceItem() : setQIndex((i) => i + 1))}
      />
      {answer.isError && (
        <p role="alert" className="text-center text-sm text-destructive">
          Chưa lưu được kết quả. Kiểm tra kết nối rồi thử lại.
        </p>
      )}
    </div>
  );
}
