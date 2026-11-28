import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  KANA_CHART,
  DAKUTEN_CHART,
  HANDAKUTEN_CHART,
  YOON_CHART,
  buildKanaQuiz,
  getKanaForSection,
  speakKana,
  type KanaScript,
  type KanaSection,
  type KanaQuestion,
  type KanaQuizResult,
} from "@/lib/japanese/kana";
import {
  useKanaProgressQuery,
  useWeakKanaQuery,
  useSubmitKanaAttemptMutation,
} from "@/hooks/queries/japanese.queries";
import type { KanaAttemptResponse } from "@/api/japanese.api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/japanese/kana")({
  component: KanaPage,
});

type Mode = "chart" | "quiz" | "progress";
const QUIZ_LENGTH = 10;

const SECTION_LABELS: Record<KanaSection, string> = {
  basic: "Cơ bản",
  dakuten: "Dakuten (゛)",
  handakuten: "Handakuten (゜)",
  yoon: "Yōon (拗音)",
};

function KanaPage() {
  const [script, setScript] = useState<KanaScript>("hiragana");
  const [mode, setMode] = useState<Mode>("chart");
  const [section, setSection] = useState<KanaSection>("basic");

  function switchScript(s: KanaScript) {
    setScript(s);
    // reset section to basic when switching scripts to avoid confusion
    setSection("basic");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Bảng chữ cái tiếng Nhật</h1>
        <p className="text-sm text-muted-foreground">
          Học Hiragana, Katakana và các biến thể. Làm quiz để luyện tập và theo dõi tiến độ.
        </p>
      </header>

      {/* Script + Mode tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={script === "hiragana" ? "default" : "outline"}
          onClick={() => switchScript("hiragana")}
        >
          Hiragana
        </Button>
        <Button
          size="sm"
          variant={script === "katakana" ? "default" : "outline"}
          onClick={() => switchScript("katakana")}
        >
          Katakana
        </Button>
        <div className="mx-2 h-5 w-px bg-border" />
        <Button
          size="sm"
          variant={mode === "chart" ? "default" : "outline"}
          onClick={() => setMode("chart")}
        >
          Bảng
        </Button>
        <Button
          size="sm"
          variant={mode === "quiz" ? "default" : "outline"}
          onClick={() => setMode("quiz")}
        >
          Quiz
        </Button>
        <Button
          size="sm"
          variant={mode === "progress" ? "default" : "outline"}
          onClick={() => setMode("progress")}
        >
          Tiến độ
        </Button>
      </div>

      {/* Section tabs (only for chart + quiz) */}
      {mode !== "progress" && (
        <div className="flex flex-wrap gap-2">
          {(["basic", "dakuten", "handakuten", "yoon"] as KanaSection[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                section === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {SECTION_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {mode === "chart" && <KanaChart script={script} section={section} />}
      {mode === "quiz" && (
        <KanaQuiz key={`${script}-${section}`} script={script} section={section} />
      )}
      {mode === "progress" && <KanaProgressView script={script} />}
    </div>
  );
}

// ── Chart ───────────────────────────────────────────────────────────────────

function KanaChart({ script, section }: { script: KanaScript; section: KanaSection }) {
  if (section === "basic") {
    return (
      <div className="grid grid-cols-5 gap-2">
        {KANA_CHART[script]
          .flat()
          .map((cell, i) =>
            cell ? (
              <KanaCell key={`${cell.romaji}-${i}`} entry={cell} />
            ) : (
              <div key={`empty-${i}`} />
            ),
          )}
      </div>
    );
  }

  const entries =
    section === "dakuten"
      ? DAKUTEN_CHART[script]
      : section === "handakuten"
        ? HANDAKUTEN_CHART[script]
        : YOON_CHART[script];
  const cols = section === "yoon" ? 3 : 5;

  return (
    <div className={`grid grid-cols-${cols} gap-2`}>
      {entries.map((entry) => (
        <KanaCell key={entry.kana} entry={entry} />
      ))}
    </div>
  );
}

function KanaCell({ entry }: { entry: { kana: string; romaji: string } }) {
  return (
    <button
      type="button"
      onClick={() => speakKana(entry.kana)}
      className="flex flex-col items-center rounded-lg border bg-card p-3 transition hover:bg-accent"
    >
      <span className="text-3xl">{entry.kana}</span>
      <span className="text-xs text-muted-foreground">{entry.romaji}</span>
    </button>
  );
}

// ── Quiz ────────────────────────────────────────────────────────────────────

function KanaQuiz({ script, section }: { script: KanaScript; section: KanaSection }) {
  const questions = useMemo<KanaQuestion[]>(
    () => buildKanaQuiz(script, QUIZ_LENGTH, section),
    [script, section],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<KanaQuizResult[]>([]);
  const [response, setResponse] = useState<KanaAttemptResponse | null>(null);

  const submitMutation = useSubmitKanaAttemptMutation();

  if (questions.length === 0) return null;

  const finished = index >= questions.length;
  const current = questions[index];

  function choose(option: string) {
    if (picked !== null) return;
    const isCorrect = option === current.target.romaji;
    if (isCorrect) setScore((s) => s + 1);
    setPicked(option);
    setResults((r) => [
      ...r,
      { kana: current.target.kana, romaji: current.target.romaji, isCorrect },
    ]);
  }

  function next() {
    if (index + 1 >= questions.length) {
      submitResults([...results]);
    }
    setPicked(null);
    setIndex((i) => i + 1);
  }

  function submitResults(finalResults: KanaQuizResult[]) {
    const clientAttemptId = typeof crypto !== "undefined" ? crypto.randomUUID() : undefined;
    submitMutation.mutate(
      {
        clientAttemptId,
        script,
        section,
        score: finalResults.filter((r) => r.isCorrect).length,
        total: finalResults.length,
        answers: finalResults.map(({ kana, isCorrect }) => ({ kana, isCorrect })),
      },
      {
        onSuccess: (data) => setResponse(data),
        onError: () => toast.error("Không thể lưu kết quả. Vui lòng thử lại."),
      },
    );
  }

  function restart() {
    setIndex(0);
    setScore(0);
    setPicked(null);
    setResults([]);
    setResponse(null);
  }

  if (finished) {
    return (
      <Card className="space-y-5 p-6">
        <div className="text-center">
          <p className="text-2xl font-bold">
            {score}/{questions.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {score === questions.length
              ? "Hoàn hảo! 🎉"
              : score >= questions.length * 0.7
                ? "Tốt lắm! 👍"
                : "Cần luyện thêm 💪"}
          </p>
        </div>

        {response?.weakKana && response.weakKana.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Chữ cần luyện thêm:</p>
            <div className="flex flex-wrap gap-2">
              {response.weakKana.map((w) => (
                <div
                  key={w.kana}
                  className="flex flex-col items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2"
                >
                  <span className="text-xl">{w.kana}</span>
                  <span className="text-xs text-muted-foreground">
                    {w.accuracy !== null ? `${Math.round(w.accuracy * 100)}%` : "0%"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button className="w-full" onClick={restart}>
          Làm lại
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-6 p-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Câu {index + 1}/{questions.length}
        </span>
        <span>Điểm: {score}</span>
      </div>

      <div className="text-center">
        <span className="text-7xl">{current.target.kana}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {current.options.map((option) => {
          const isCorrect = option === current.target.romaji;
          const isPicked = option === picked;
          const tone =
            picked === null
              ? "hover:bg-accent"
              : isCorrect
                ? "border-green-500 bg-green-50 dark:bg-green-950"
                : isPicked
                  ? "border-red-500 bg-red-50 dark:bg-red-950"
                  : "opacity-60";
          return (
            <button
              key={option}
              type="button"
              disabled={picked !== null}
              onClick={() => choose(option)}
              className={`rounded-lg border p-3 text-lg transition ${tone}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {picked === current.target.romaji
              ? "✓ Chính xác!"
              : `✗ Đáp án: ${current.target.romaji}`}
          </span>
          <Button onClick={next}>{index + 1 === questions.length ? "Xem kết quả" : "Tiếp"}</Button>
        </div>
      )}
    </Card>
  );
}

// ── Progress ─────────────────────────────────────────────────────────────────

const SECTION_TOTALS: Record<KanaSection, number> = {
  basic: 46,
  dakuten: 20,
  handakuten: 5,
  yoon: 33,
};

function KanaProgressView({ script }: { script: KanaScript }) {
  const { data: progressData, isLoading } = useKanaProgressQuery();
  const { data: weakKana } = useWeakKanaQuery(script);

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  const sections = progressData?.sections.filter((s) => s.script === script) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["basic", "dakuten", "handakuten", "yoon"] as KanaSection[]).map((sec) => {
          const data = sections.find((s) => s.section === sec);
          const total = SECTION_TOTALS[sec];
          const mastered = data?.mastered ?? 0;
          const pct = Math.round((mastered / total) * 100);
          return (
            <Card key={sec} className="space-y-2 p-4">
              <p className="text-xs font-medium text-muted-foreground">{SECTION_LABELS[sec]}</p>
              <p className="text-2xl font-bold">
                {mastered}
                <span className="text-sm font-normal text-muted-foreground">/{total}</span>
              </p>
              <Progress value={pct} className="h-1.5" />
              {data?.overallAccuracy != null && (
                <p className="text-xs text-muted-foreground">
                  {Math.round(data.overallAccuracy * 100)}% chính xác
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {weakKana && weakKana.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Chữ cần luyện thêm</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {weakKana.slice(0, 15).map((w) => (
              <div
                key={w.kana}
                className="flex flex-col items-center rounded-lg border bg-card px-2 py-3 text-center"
                title={`${w.correctCount}/${w.totalSeen} đúng`}
              >
                <span className="text-2xl">{w.kana}</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {w.accuracy !== null ? `${Math.round(w.accuracy * 100)}%` : "Chưa học"}
                </span>
                {w.accuracy !== null && w.accuracy < 0.5 && (
                  <Badge variant="destructive" className="mt-1 text-[10px] px-1 py-0">
                    Yếu
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(!weakKana || weakKana.length === 0) && sections.some((s) => s.seen > 0) && (
        <p className="text-sm text-muted-foreground">Tuyệt vời! Không có chữ nào cần luyện thêm.</p>
      )}

      {sections.every((s) => s.seen === 0) && (
        <p className="text-sm text-muted-foreground">
          Chưa có dữ liệu. Hãy làm quiz để xem tiến độ của bạn.
        </p>
      )}
    </div>
  );
}
