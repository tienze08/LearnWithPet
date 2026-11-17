import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import type { TangoAttemptAnswer, TangoAttemptResponse, TangoQuizMode, TangoQuizScope } from "@/api/tango.api";
import { useSubmitTangoAttemptMutation, useTangoQuizQuery } from "@/hooks/queries/tango.queries";
import { EmptyBlock, ErrorBlock, LoadingBlock, ProgressBar } from "@/components/tango/shared";

type PracticeSearch = { mode?: TangoQuizMode; scope?: TangoQuizScope; n?: number };

const MODES: TangoQuizMode[] = ["MIXED", "JP_TO_MEANING", "VI_TO_JP"];
const SCOPES: TangoQuizScope[] = ["ALL", "MISTAKES"];

export const Route = createFileRoute("/app/japanese/tango/practice/$lessonId")({
  validateSearch: (search: Record<string, unknown>): PracticeSearch => ({
    mode: MODES.includes(search.mode as TangoQuizMode) ? (search.mode as TangoQuizMode) : "MIXED",
    scope: SCOPES.includes(search.scope as TangoQuizScope) ? (search.scope as TangoQuizScope) : "ALL",
    n: typeof search.n === "number" ? search.n : undefined,
  }),
  component: TangoPractice,
});

function TangoPractice() {
  const { lessonId } = Route.useParams();
  const search = Route.useSearch();
  const mode = search.mode ?? "MIXED";
  const scope = search.scope ?? "ALL";
  // A new nonce starts a fresh session (new questions, new clientAttemptId).
  return <PracticeSession key={`${mode}-${scope}-${search.n ?? 0}`} lessonId={Number(lessonId)} lessonParam={lessonId} mode={mode} scope={scope} nonce={search.n ?? 0} />;
}

function PracticeSession({
  lessonId,
  lessonParam,
  mode,
  scope,
  nonce,
}: {
  lessonId: number;
  lessonParam: string;
  mode: TangoQuizMode;
  scope: TangoQuizScope;
  nonce: number;
}) {
  const navigate = useNavigate();
  const quiz = useTangoQuizQuery(lessonId, mode, scope, nonce);
  const submit = useSubmitTangoAttemptMutation(lessonId);
  // Generated once per session and reused on retry, so a repeated submit cannot create a second attempt.
  const clientAttemptId = useRef(crypto.randomUUID());
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState("");

  if (quiz.isPending) return <LoadingBlock rows={2} />;
  if (quiz.isError) {
    return (
      <div className="space-y-4">
        <BackLink lessonParam={lessonParam} />
        <ErrorBlock error={quiz.error} onRetry={() => quiz.refetch()} />
      </div>
    );
  }

  const questions = quiz.data.questions;
  const total = questions.length;

  if (submit.isSuccess) {
    return (
      <ResultView
        result={submit.data}
        lessonParam={lessonParam}
        onPracticeMistakes={() => navigate({ to: "/app/japanese/tango/practice/$lessonId", params: { lessonId: lessonParam }, search: { mode: "MIXED", scope: "MISTAKES", n: Date.now() } })}
        onPracticeAgain={() => navigate({ to: "/app/japanese/tango/practice/$lessonId", params: { lessonId: lessonParam }, search: { mode, scope, n: Date.now() } })}
      />
    );
  }

  if (total === 0) {
    return (
      <div className="space-y-4">
        <BackLink lessonParam={lessonParam} />
        <EmptyBlock title={scope === "MISTAKES" ? "Bạn không có từ nào cần ôn trong bài này." : "Bài học này chưa đủ từ để kiểm tra."}>
          {scope === "MISTAKES" && (
            <Button asChild className="mt-3" variant="outline">
              <Link to="/app/japanese/tango/practice/$lessonId" params={{ lessonId: lessonParam }} search={{ mode: "MIXED", scope: "ALL" }}>
                Làm bài đầy đủ
              </Link>
            </Button>
          )}
        </EmptyBlock>
      </div>
    );
  }

  const question = questions[index];
  const answeredCount = Object.keys(answers).length;
  const remaining = total - answeredCount;
  const allAnswered = remaining === 0;
  const isJapaneseAnswer = question.mode === "VI_TO_JP";

  const commitAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [question.vocabularyId]: value }));
    setDraft("");
    if (index < total - 1) setIndex(index + 1);
  };

  const onSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    commitAnswer(draft.trim());
  };

  const submitAll = () => {
    const payload: TangoAttemptAnswer[] = questions
      .filter((q) => answers[q.vocabularyId] !== undefined)
      .map((q) => ({ vocabularyId: q.vocabularyId, mode: q.mode, answer: answers[q.vocabularyId] }));
    submit.mutate({
      clientAttemptId: clientAttemptId.current,
      mode,
      scope,
      answers: payload,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <BackLink lessonParam={lessonParam} />
        <p className="text-sm font-bold">
          Câu {index + 1} / {total}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <Stat label="Đã trả lời" value={answeredCount} />
        <Stat label="Còn lại" value={remaining} />
        <Stat label="Tổng câu" value={total} />
      </div>
      <p className="text-xs text-muted-foreground">
        Đúng/sai sẽ được chấm và hiển thị ở màn kết quả, sau khi bạn nộp bài.
      </p>
      <ProgressBar value={(answeredCount / total) * 100} label="Tiến độ làm bài" />

      <Card className="card-pop space-y-5 rounded-3xl p-8 text-center">
        <p className="text-sm font-bold text-muted-foreground">
          {isJapaneseAnswer ? "Viết bằng tiếng Nhật (kana hoặc kanji)" : "Nghĩa tiếng Việt là gì?"}
        </p>
        <p className="text-4xl font-extrabold">{question.prompt.text}</p>
        {!isJapaneseAnswer && question.prompt.kana && (
          <p className="text-sm text-muted-foreground">{question.prompt.kana}</p>
        )}
        <form onSubmit={onSubmitForm} className="space-y-3">
          <Input
            aria-label="Đáp án"
            autoFocus
            value={draft}
            placeholder={answers[question.vocabularyId] ? `Đã trả lời: ${answers[question.vocabularyId]}` : "Nhập đáp án"}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="submit" disabled={!draft.trim()}>
              Trả lời
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={index === 0}
              onClick={() => {
                setDraft("");
                setIndex(index - 1);
              }}
            >
              Câu trước
            </Button>
          </div>
        </form>
      </Card>

      <div className="flex flex-col items-center gap-2">
        <Button onClick={submitAll} disabled={!allAnswered || submit.isPending}>
          {submit.isPending ? "Đang nộp..." : "Nộp bài"}
        </Button>
        {!allAnswered && <p className="text-xs text-muted-foreground">Trả lời hết câu hỏi để nộp bài.</p>}
        {submit.isError && (
          <p role="alert" className="text-center text-sm text-destructive">
            {submit.error.message} Bấm "Nộp bài" lại để gửi lại đúng bài này.
          </p>
        )}
      </div>
    </div>
  );
}

function ResultView({
  result,
  lessonParam,
  onPracticeMistakes,
  onPracticeAgain,
}: {
  result: TangoAttemptResponse;
  lessonParam: string;
  onPracticeMistakes: () => void;
  onPracticeAgain: () => void;
}) {
  const wrong = result.results.filter((r) => !r.isCorrect);
  const percent = Math.round(result.accuracy * 100);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink lessonParam={lessonParam} />
      <Card className="card-pop space-y-4 rounded-3xl p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Kết quả</p>
        <p className="text-5xl font-extrabold">{percent}%</p>
        <p className="text-sm">
          Đúng {result.correctCount} · Sai {result.incorrectCount} · Tổng {result.totalQuestions}
        </p>
        {result.scope === "ALL" ? (
          <p className={`text-sm font-bold ${result.passed ? "text-success" : "text-muted-foreground"}`}>
            {result.passed ? "Đạt (từ 80% trở lên)" : "Chưa đạt, hãy ôn lại và thử lần nữa"}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Bài ôn từ sai không tính vào hoàn thành bài học.</p>
        )}
        {result.lessonStatus === "COMPLETED" && (
          <p className="rounded-2xl bg-success/15 p-3 text-sm font-bold text-success">Hoàn thành bài học</p>
        )}
        {result.replayed && (
          <p className="text-xs text-muted-foreground">Bài này đã được ghi nhận trước đó, đây là kết quả cũ.</p>
        )}
      </Card>

      {wrong.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-extrabold">Các câu sai</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {wrong.map((r) => (
              <li key={`${r.vocabularyId}-${r.mode}`} className="space-y-1 p-4 text-sm">
                <p>
                  Bạn trả lời: <span className="font-bold">{r.submittedAnswer || "(trống)"}</span>
                </p>
                <p className="text-muted-foreground">Đáp án: {r.correctAnswers.join(" / ")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {wrong.length > 0 && (
          <Button variant="outline" onClick={onPracticeMistakes}>
            Ôn từ sai
          </Button>
        )}
        <Button onClick={onPracticeAgain}>Làm lại</Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-extrabold">{value}</p>
    </div>
  );
}

function BackLink({ lessonParam }: { lessonParam: string }) {
  return (
    <Link
      to="/app/japanese/tango/lessons/$lessonId"
      params={{ lessonId: lessonParam }}
      className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Bài học
    </Link>
  );
}
