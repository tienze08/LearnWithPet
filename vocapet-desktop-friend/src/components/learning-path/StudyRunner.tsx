import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/tango/shared";
import type { Phase, PathItemType } from "@/api/learning-path.api";
import type { PathContent } from "@/lib/learning-path/content";
import { exerciseItems, type Exercise } from "@/lib/learning-path/questions";
import { usePathAnswerMutation } from "@/hooks/queries/learning-path.queries";
import { ItemLesson } from "./ItemLesson";
import { Seal } from "./studio";
import { QuestionCard } from "./QuestionCard";
import { MatchCard, OrderCard } from "./ExerciseCards";

export interface RunnerItem {
  itemType: PathItemType;
  itemId: string;
  done: boolean;
  label?: string;
}

/** learn: lesson then check · review: check only · practice: practice exercises. */
export type RunnerMode = "learn" | "review" | "practice";

const keyOf = (i: { itemType: string; itemId: string }) => `${i.itemType}:${i.itemId}`;

/**
 * Walks one phase. Items already done (per the server) are skipped, so leaving midway resumes where the learner
 * stopped. Every item is graded through the answer endpoint with its phase; an item with several questions counts
 * as correct only when all are right.
 */
export function StudyRunner({
  items,
  mode,
  phase,
  content,
  onFinished,
}: {
  items: RunnerItem[];
  mode: RunnerMode;
  phase: Phase;
  content: PathContent;
  onFinished: () => void;
}) {
  const answer = usePathAnswerMutation();
  const [finished, setFinished] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.done).map(keyOf)),
  );
  // Saves run in the background; leaving the phase waits for them so the next screen sees every answer.
  const pending = useRef<Promise<unknown>[]>([]);
  const record = (itemType: PathItemType, itemId: string, correct: boolean, kind: string) => {
    const p = answer
      .mutateAsync({
        itemType,
        itemId,
        correct,
        review: phase === "REVIEW",
        questionKind: kind,
        phase,
      })
      .catch(() => {});
    pending.current.push(p);
  };
  const finish = async () => {
    await Promise.allSettled(pending.current);
    onFinished();
  };

  const header = (done: number, total: number, label: string, badge?: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="studio-kicker studio-kicker-muted">
          {label}
          {badge && (
            <span
              className={`ml-2 normal-case tracking-normal ${badge === "Yếu" ? "text-ochre" : ""}`}
            >
              · {badge}
            </span>
          )}
        </span>
        <span className="font-semibold tabular-nums">
          {Math.min(done + 1, total)} / {total}
        </span>
      </div>
      <ProgressBar
        value={Math.round((done / Math.max(1, total)) * 100)}
        label="Tiến độ giai đoạn"
      />
    </div>
  );

  const saveError = answer.isError && (
    <p role="alert" className="text-center text-sm text-destructive">
      Chưa lưu được kết quả. Kiểm tra kết nối rồi thử lại.
    </p>
  );

  if (mode === "practice") {
    return (
      <PracticeRunner
        items={items}
        finished={finished}
        setFinished={setFinished}
        content={content}
        record={record}
        header={header}
        onFinished={finish}
        saveError={saveError}
      />
    );
  }
  return (
    <ItemRunner
      items={items}
      learn={mode === "learn"}
      finished={finished}
      setFinished={setFinished}
      content={content}
      record={record}
      header={header}
      onFinished={finish}
      saveError={saveError}
    />
  );
}

type Shared = {
  items: RunnerItem[];
  finished: Set<string>;
  setFinished: React.Dispatch<React.SetStateAction<Set<string>>>;
  content: PathContent;
  record: (t: PathItemType, id: string, correct: boolean, kind: string) => void;
  header: (done: number, total: number, label: string, badge?: string) => React.ReactNode;
  onFinished: () => void;
  saveError: React.ReactNode;
};

function Done({ onFinished }: { onFinished: () => void }) {
  return (
    <div className="grid justify-items-center gap-5 border-y border-border py-12 text-center">
      <Seal state="done" size={4} stamp label="Đã xong phần này" />
      <p className="studio-head text-3xl">Xong phần này</p>
      <Button size="lg" onClick={onFinished}>
        Tiếp tục
      </Button>
    </div>
  );
}

/** Lesson (learn mode) then the item's questions. */
function ItemRunner({
  items,
  learn,
  finished,
  setFinished,
  content,
  record,
  header,
  onFinished,
  saveError,
}: Shared & { learn: boolean }) {
  const queue = items.filter((i) => !finished.has(keyOf(i)));
  const current = queue[0];
  const [stage, setStage] = useState<"lesson" | "quiz">(learn ? "lesson" : "quiz");
  const [qIndex, setQIndex] = useState(0);
  const allRight = useRef(true);
  const questions = useMemo(
    () => (current ? content.questionsFor(current.itemType, current.itemId) : []),
    [current, content],
  );

  if (!current) return <Done onFinished={onFinished} />;
  const done = items.length - queue.length;
  const next = () => {
    setFinished((s) => new Set(s).add(keyOf(current)));
    setStage(learn ? "lesson" : "quiz");
    setQIndex(0);
    allRight.current = true;
  };
  const top = header(
    done,
    items.length,
    learn ? (stage === "lesson" ? "Bài học" : "Kiểm tra nhanh") : "Ôn tập",
    current.label,
  );

  if (stage === "lesson") {
    return (
      <div className="space-y-6">
        {top}
        <ItemLesson type={current.itemType} id={current.itemId} content={content} />
        <div className="sticky bottom-4 flex justify-end">
          <Button size="lg" onClick={() => setStage("quiz")}>
            Đã hiểu, làm bài tập
          </Button>
        </div>
      </div>
    );
  }
  if (questions.length === 0) {
    // No question could be built (too little data for distractors): accept the item as seen, graded as correct.
    return (
      <div className="space-y-6">
        {top}
        <p className="text-sm text-muted-foreground">Chưa tạo được câu hỏi cho nội dung này.</p>
        <Button
          onClick={() => {
            record(current.itemType, current.itemId, true, "no-question");
            next();
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
      {top}
      <QuestionCard
        q={q}
        nextLabel={last ? "Tiếp tục" : "Câu tiếp"}
        onAnswer={(correct) => {
          allRight.current &&= correct;
          if (last)
            record(
              current.itemType,
              current.itemId,
              allRight.current,
              questions.map((x) => x.kind).join("+"),
            );
        }}
        onNext={() => (last ? next() : setQIndex((i) => i + 1))}
      />
      {saveError}
    </div>
  );
}

/** Practice exercises over the phase's unfinished items: match, order, recognition, cloze. */
function PracticeRunner({
  items,
  finished,
  setFinished,
  content,
  record,
  header,
  onFinished,
  saveError,
}: Shared) {
  // Built once from what was left when the phase opened, so a refetch cannot reshuffle the exercises.
  const [{ exercises, uncovered }] = useState(() => {
    const left = items.filter((i) => !finished.has(keyOf(i)));
    const list: Exercise[] = content.practiceFor(left);
    const covered = new Set(list.flatMap(exerciseItems).map(keyOf));
    return { exercises: list, uncovered: left.filter((i) => !covered.has(keyOf(i))) };
  });
  const [index, setIndex] = useState(0);
  const ex = exercises[index];
  if (!ex) {
    // Items with no possible exercise (too little data for one) would block the phase: count them as practised.
    const end = () => {
      uncovered.forEach((i) => record(i.itemType, i.itemId, true, "no-exercise"));
      onFinished();
    };
    return <Done onFinished={end} />;
  }

  const complete = (results: { itemType: PathItemType; itemId: string; correct: boolean }[]) => {
    results.forEach((r) => record(r.itemType, r.itemId, r.correct, ex.kind));
    setFinished((s) => {
      const n = new Set(s);
      results.forEach((r) => n.add(keyOf(r)));
      return n;
    });
  };
  const next = () => setIndex((i) => i + 1);
  const top = header(index, exercises.length, "Luyện tập");

  if ("type" in ex && ex.type === "match") {
    return (
      <div className="space-y-6">
        {top}
        <MatchCard
          key={index}
          ex={ex}
          onDone={(rs) => {
            complete(
              rs.map((r) => ({ itemType: "VOCAB" as const, itemId: r.itemId, correct: r.correct })),
            );
            next();
          }}
        />
        {saveError}
      </div>
    );
  }
  if ("type" in ex && ex.type === "order") {
    return (
      <div className="space-y-6">
        {top}
        <OrderCard
          key={index}
          ex={ex}
          onAnswer={(c) => complete([{ itemType: "GRAMMAR", itemId: ex.itemId, correct: c }])}
          onNext={next}
        />
        {saveError}
      </div>
    );
  }
  const covered = exerciseItems(ex)[0];
  return (
    <div className="space-y-6">
      {top}
      <QuestionCard q={ex} onAnswer={(c) => complete([{ ...covered, correct: c }])} onNext={next} />
      {saveError}
    </div>
  );
}
