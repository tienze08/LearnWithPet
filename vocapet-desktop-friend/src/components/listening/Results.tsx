import { Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { PatternTitle } from "@/components/grammar/PatternTitle";
import { Button } from "@/components/ui/button";
import type { ListeningAttemptRequest } from "@/api/listening.api";
import type { GrammarPoint } from "@/data/japanese/grammar";
import { questionId, summarize, type Recommendation } from "@/lib/listening/session";
import type { Lesson } from "@/lib/listening/types";
import { formatTime } from "@/components/audio/AudioPlayer";

export interface WordLink {
  id: number;
  expression: string | null;
  kana: string;
  primaryMeaning: string | null;
}

/** Grammar ids and words as links, with the meaning taken from the grammar and Tango data. */
export function Related({
  grammarIds,
  words,
  grammar,
  vocabulary,
  explain,
}: {
  grammarIds: string[];
  words: string[];
  grammar: GrammarPoint[];
  vocabulary: WordLink[];
  /** Also show each grammar point's explanation. */
  explain?: boolean;
}) {
  const points = grammar.filter((g) => grammarIds.includes(g.id));
  if (!points.length && !words.length) return null;
  const chip = "inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-surface-2 px-3 text-sm";
  return (
    <div className="space-y-2">
      {words.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Từ vựng</span>
          {words.map((w) => {
            const found = vocabulary.find((v) => (v.expression ?? v.kana) === w);
            return found ? (
              <Link
                key={w}
                to="/app/japanese/tango/vocabularies/$vocabularyId"
                params={{ vocabularyId: String(found.id) }}
                className={`${chip} hover:bg-primary-soft`}
              >
                <b lang="ja">{w}</b> {found.primaryMeaning}
              </Link>
            ) : (
              <span key={w} lang="ja" className={chip}>
                {w}
              </span>
            );
          })}
        </p>
      )}
      {points.length > 0 && (
        <ul className="space-y-1.5">
          {points.map((g) => (
            <li key={g.id}>
              <Link
                to="/app/japanese/grammar/$grammarId"
                params={{ grammarId: g.id }}
                className={`${chip} hover:bg-primary-soft`}
              >
                <span className="text-xs text-muted-foreground">Ngữ pháp</span>
                <PatternTitle pattern={g.displayPattern} className="font-bold" />
              </Link>
              {explain && g.explanationVi && (
                <p className="mt-1 text-sm text-muted-foreground">{g.explanationVi}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Results({
  lesson,
  attempt,
  saving,
  saveError,
  onRetrySave,
  onReview,
  onRestart,
  next,
  grammar,
  vocabulary,
}: {
  lesson: Lesson;
  attempt: ListeningAttemptRequest;
  saving: boolean;
  saveError: Error | null;
  onRetrySave: () => void;
  onReview: (ids: string[]) => void;
  onRestart: () => void;
  next: Recommendation | null;
  grammar: GrammarPoint[];
  vocabulary: WordLink[];
}) {
  const result = summarize(attempt.answers);
  const stats = [
    ["Câu đã làm", result.total],
    ["Trả lời đúng", result.correct],
    ["Độ chính xác", `${Math.round(result.accuracy * 100)}%`],
    ["Số lần nghe lại", result.replays],
    ["Thời gian", formatTime(attempt.durationSeconds)],
  ];
  const questions = lesson.exercises.flatMap((e) =>
    e.type === "dialogue"
      ? e.questions.map((q) => ({
          id: questionId(lesson, e.id, q.id),
          title: q.question,
          explain: q.explain,
        }))
      : [
          {
            id: questionId(lesson, e.id),
            title: e.type === "choose" ? e.question : lesson.lines[e.line].japanese,
            explain: e.explain,
          },
        ],
  );
  const kanji = [...new Set(lesson.lines.flatMap((l) => l.kanji))];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="studio-seal"
          data-state="done"
          data-stamp
          style={{ "--seal-size": "3.5rem" } as React.CSSProperties}
        >
          済
        </span>
        <div>
          <p className="studio-kicker">
            {attempt.mode === "REVIEW" ? "Đã ôn xong câu sai" : "Hoàn thành bài nghe"}
          </p>
          <h1 className="studio-head text-2xl">{lesson.title}</h1>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="ref-card flex flex-col-reverse items-center p-3 text-center">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="studio-head text-2xl">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Đây là kết quả của riêng lượt này, chưa phải mức thành thạo kỹ năng nghe. Nghe lại nhiều
        lần, mức Dễ hay đã đọc transcript đều làm bài dễ hơn. Tiến độ từ vựng và ngữ pháp không thay
        đổi.
      </p>

      {saving ? (
        <p role="status" className="text-sm">
          Đang lưu kết quả…
        </p>
      ) : saveError ? (
        <div role="alert" className="border-l-2 border-seal py-2 pl-4 text-sm">
          <p className="font-semibold">Chưa lưu được kết quả</p>
          <p className="text-muted-foreground">
            {saveError.message}. Giữ nguyên trang này rồi thử lại.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetrySave}>
            Thử lại
          </Button>
        </div>
      ) : (
        <p role="status" className="text-sm text-primary">
          Đã lưu kết quả.
        </p>
      )}

      <section className="ref-card space-y-3 p-4" aria-label="Điểm cần luyện">
        <h2 className="font-bold">Điểm cần luyện</h2>
        {result.weakWords.length || result.weakGrammar.length ? (
          <Related
            grammarIds={result.weakGrammar}
            words={result.weakWords}
            grammar={grammar}
            vocabulary={vocabulary}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {result.mistakes.length
              ? "Các câu sai chưa gắn với từ hay mẫu ngữ pháp cụ thể."
              : "Không có câu sai trong lượt này."}
          </p>
        )}
        {kanji.length > 0 && (
          <p className="text-sm">
            Kanji trong bài:{" "}
            <span lang="ja" className="text-lg">
              {kanji.join(" ")}
            </span>
          </p>
        )}
      </section>

      <section className="ref-card p-4" aria-label="Giải thích từng câu">
        <h2 className="font-bold">Xem lại từng câu</h2>
        <ul className="divide-y divide-border">
          {questions.map((q) => {
            const answer = attempt.answers.find((a) => a.questionId === q.id);
            if (!answer) return null;
            return (
              <li key={q.id} className="flex gap-3 py-3 text-sm">
                {answer.correct ? (
                  <Check aria-label="Đúng" className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <X aria-label="Sai" className="h-5 w-5 shrink-0 text-seal-ink" />
                )}
                <div>
                  <p className="font-semibold">{q.title}</p>
                  <p className="text-muted-foreground">{q.explain}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {next && (
        <p className="studio-note text-sm">
          <b>Nên luyện tiếp:</b> {next.lesson.title}. {next.reason}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {result.mistakes.length > 0 && (
          <Button
            type="button"
            className="h-11 rounded-full"
            onClick={() => onReview(result.mistakes)}
          >
            Ôn lại {result.mistakes.length} câu sai
          </Button>
        )}
        {next && (
          <Button
            asChild
            variant={result.mistakes.length ? "outline" : "default"}
            className="h-11 rounded-full"
          >
            <Link
              to="/app/listening/$lessonId"
              params={{ lessonId: next.lesson.id }}
              search={{ review: next.review || undefined }}
            >
              Bài tiếp theo
            </Link>
          </Button>
        )}
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={onRestart}>
          Làm lại cả bài
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-full">
          <Link to="/app/listening">Chọn bài khác</Link>
        </Button>
      </div>
    </div>
  );
}
