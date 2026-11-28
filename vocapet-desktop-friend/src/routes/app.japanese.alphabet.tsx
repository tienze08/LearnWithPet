import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  KANA_CHART,
  DAKUTEN_CHART,
  HANDAKUTEN_CHART,
  YOON_CHART,
  getKanaForSection,
  getSectionForKana,
  checkRomaji,
  speakKana,
  type KanaEntry,
  type KanaScript,
  type KanaSection,
} from "@/lib/japanese/kana";
import {
  useKanaProgressQuery,
  useKanaItemsQuery,
  useSubmitKanaAttemptMutation,
} from "@/hooks/queries/japanese.queries";
import { submitKanaAttempt } from "@/api/japanese.api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Volume2 } from "lucide-react";

export const Route = createFileRoute("/app/japanese/alphabet")({
  component: AlphabetPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type QuizSectionOption = KanaSection | "all";
type QuizCountOption = 10 | 20 | "all";

interface QuizConfig {
  script: KanaScript;
  section: QuizSectionOption;
  count: QuizCountOption;
  weakMode: boolean;
}

interface QuizItem extends KanaEntry {
  section: KanaSection;
}

interface KanaResult {
  kana: string;
  section: KanaSection;
  isCorrect: boolean;
}

// ── Session storage ───────────────────────────────────────────────────────────

const SESSION_KEY = "vocapet_kana_quiz";
const SESSION_TTL = 2 * 60 * 60 * 1000;

function saveSession(queue: QuizItem[], config: QuizConfig) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ queue, config, ts: Date.now() }));
  } catch {
    /* storage blocked: the quiz just is not restored */
  }
}

function loadSession(): { queue: QuizItem[]; config: QuizConfig } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.ts > SESSION_TTL) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: the quiz just is not restored */
  }
}

// ── Build quiz queue ──────────────────────────────────────────────────────────

function buildQueue(config: QuizConfig, weakKanaSet?: Set<string>): QuizItem[] {
  const sections: KanaSection[] =
    config.section === "all" ? ["basic", "dakuten", "handakuten", "yoon"] : [config.section];
  let pool: QuizItem[] = sections.flatMap((s) =>
    getKanaForSection(config.script, s).map((e) => ({ ...e, section: s })),
  );
  if (config.weakMode && weakKanaSet && weakKanaSet.size > 0) {
    pool = pool.filter((item) => weakKanaSet.has(item.kana));
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  if (config.count === "all") return shuffled;
  return shuffled.slice(0, Math.min(config.count, shuffled.length));
}

// ── Mastery status helper ─────────────────────────────────────────────────────

type KanaStatus = "unseen" | "learning" | "mastered";

function getStatus(
  kana: string,
  itemMap: Map<string, { mastered: boolean; wrongCount: number }>,
): KanaStatus {
  const item = itemMap.get(kana);
  if (!item) return "unseen";
  return item.mastered ? "mastered" : "learning";
}

// ── AlphabetPage ─────────────────────────────────────────────────────────────

function AlphabetPage() {
  const [view, setView] = useState<"chart" | "quiz">("chart");
  const [script, setScript] = useState<KanaScript>("hiragana");
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [restoredSession, setRestoredSession] = useState<{
    queue: QuizItem[];
    config: QuizConfig;
  } | null>(null);

  const { data: progressData } = useKanaProgressQuery();
  const { data: itemsData } = useKanaItemsQuery(script);

  const itemMap = new Map(
    (itemsData ?? []).map((i) => [i.kana, { mastered: i.mastered, wrongCount: i.wrongCount }]),
  );

  const sections = progressData?.sections.filter((s) => s.script === script) ?? [];
  const totalMastered = sections.reduce((sum, s) => sum + s.mastered, 0);
  const totalKana = sections.reduce((sum, s) => sum + s.totalKana, 0) || 104;
  const totalSeen = sections.reduce((sum, s) => sum + s.seen, 0);
  const overallAccuracy =
    totalSeen > 0
      ? Math.round(
          (sections.reduce((sum, s) => sum + (s.overallAccuracy ?? 0) * s.seen, 0) / totalSeen) *
            100,
        )
      : null;

  function startQuiz(config: QuizConfig, sessionQueue?: QuizItem[]) {
    setQuizConfig(config);
    if (sessionQueue) setRestoredSession({ queue: sessionQueue, config });
    else setRestoredSession(null);
    setView("quiz");
  }

  if (view === "quiz" && quizConfig) {
    return (
      <QuizView
        config={quizConfig}
        initialQueue={restoredSession?.queue ?? null}
        script={script}
        onBack={() => {
          clearSession();
          setView("chart");
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Japanese Alphabet</h1>
          <p className="text-sm text-muted-foreground">
            {totalMastered}/{totalKana} mastered
            {overallAccuracy !== null && <span> · {overallAccuracy}% accuracy</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={script === "hiragana" ? "default" : "outline"}
            onClick={() => setScript("hiragana")}
          >
            Hiragana
          </Button>
          <Button
            size="sm"
            variant={script === "katakana" ? "default" : "outline"}
            onClick={() => setScript("katakana")}
          >
            Katakana
          </Button>
          <Button
            size="sm"
            onClick={() => startQuiz({ script, section: "all", count: 10, weakMode: false })}
          >
            Start Quiz ▶
          </Button>
        </div>
      </div>

      {/* Config panel */}
      <QuizConfigPanel
        script={script}
        onStart={startQuiz}
        onCheckSession={() => {
          const session = loadSession();
          if (session) startQuiz(session.config, session.queue);
        }}
      />

      {/* Chart sections */}
      <KanaSectionDisplay
        label="Basic"
        kanaCount={46}
        script={script}
        entries={KANA_CHART[script].flat().map((e, i) => ({ entry: e, i }))}
        isGrid
        itemMap={itemMap}
        progress={sections.find((s) => s.section === "basic")}
      />
      <KanaSectionDisplay
        label="Dakuten ゛"
        kanaCount={20}
        script={script}
        entries={DAKUTEN_CHART[script].map((e, i) => ({ entry: e, i }))}
        itemMap={itemMap}
        progress={sections.find((s) => s.section === "dakuten")}
      />
      <KanaSectionDisplay
        label="Handakuten ゜"
        kanaCount={5}
        script={script}
        entries={HANDAKUTEN_CHART[script].map((e, i) => ({ entry: e, i }))}
        itemMap={itemMap}
        progress={sections.find((s) => s.section === "handakuten")}
      />
      <KanaSectionDisplay
        label="Yōon 拗音"
        kanaCount={33}
        script={script}
        entries={YOON_CHART[script].map((e, i) => ({ entry: e, i }))}
        cols={3}
        itemMap={itemMap}
        progress={sections.find((s) => s.section === "yoon")}
      />
    </div>
  );
}

// ── Quiz config panel ─────────────────────────────────────────────────────────

function QuizConfigPanel({
  script,
  onStart,
  onCheckSession,
}: {
  script: KanaScript;
  onStart: (c: QuizConfig) => void;
  onCheckSession: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<QuizSectionOption>("all");
  const [count, setCount] = useState<QuizCountOption>(10);
  const [weakMode, setWeakMode] = useState(false);
  const hasSession = !!loadSession();

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Configure Quiz
        </Button>
        {hasSession && (
          <Button variant="outline" size="sm" onClick={onCheckSession}>
            Resume previous session
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <p className="text-sm font-semibold">Configure Quiz</p>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Section</p>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "basic", "dakuten", "handakuten", "yoon"] as QuizSectionOption[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`rounded-full px-3 py-1 text-xs capitalize transition ${section === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {s === "all" ? "All" : s === "yoon" ? "Yōon" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Questions</p>
        <div className="flex gap-1.5">
          {([10, 20, "all"] as QuizCountOption[]).map((c) => (
            <button
              key={String(c)}
              type="button"
              onClick={() => setCount(c)}
              className={`rounded-full px-3 py-1 text-xs transition ${count === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={weakMode}
          onChange={(e) => setWeakMode(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        <span className="text-sm">Practice weak kana only</span>
      </label>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setOpen(false);
            onStart({ script, section, count, weakMode });
          }}
        >
          Start ▶
        </Button>
      </div>
    </Card>
  );
}

// ── Kana section display ──────────────────────────────────────────────────────

type SectionProgress =
  | { mastered: number; totalKana: number; overallAccuracy: number | null }
  | undefined;

function KanaSectionDisplay({
  label,
  kanaCount,
  entries,
  isGrid = false,
  cols = 5,
  itemMap,
  progress,
}: {
  label: string;
  kanaCount: number;
  script: KanaScript;
  entries: { entry: KanaEntry | null; i: number }[];
  isGrid?: boolean;
  cols?: number;
  itemMap: Map<string, { mastered: boolean; wrongCount: number }>;
  progress: SectionProgress;
}) {
  const mastered = progress?.mastered ?? 0;
  const pct = Math.round((mastered / kanaCount) * 100);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </h2>
          <span className="text-xs text-muted-foreground">{kanaCount} characters</span>
          {mastered > 0 && (
            <Badge variant="secondary" className="text-xs">
              {mastered}/{kanaCount}
            </Badge>
          )}
        </div>
        {mastered > 0 && <Progress value={pct} className="h-1 w-20" />}
      </div>

      <div
        className={`grid gap-1.5 sm:gap-2`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {entries.map(({ entry, i }) =>
          entry ? (
            <KanaCard key={entry.kana} entry={entry} status={getStatus(entry.kana, itemMap)} />
          ) : (
            <div key={`e-${i}`} />
          ),
        )}
      </div>
    </section>
  );
}

// ── Kana card ─────────────────────────────────────────────────────────────────

function KanaCard({ entry, status }: { entry: KanaEntry; status: KanaStatus }) {
  const borderClass =
    status === "mastered"
      ? "border-green-400 bg-green-50/40 dark:bg-green-950/20"
      : status === "learning"
        ? "border-amber-400 bg-amber-50/30 dark:bg-amber-950/20"
        : "border-border";

  return (
    <button
      type="button"
      onClick={() => speakKana(entry.kana)}
      aria-label={`${entry.kana} — ${entry.romaji}`}
      className={`flex flex-col items-center rounded-lg border p-2 sm:p-3 transition hover:bg-accent ${borderClass}`}
    >
      <span className="text-2xl sm:text-3xl leading-none">{entry.kana}</span>
      <span className="mt-1 text-[10px] sm:text-xs text-muted-foreground">{entry.romaji}</span>
      {status !== "unseen" && (
        <span
          className={`mt-1 h-1.5 w-1.5 rounded-full ${status === "mastered" ? "bg-green-500" : "bg-amber-400"}`}
        />
      )}
    </button>
  );
}

// ── Quiz view (outer shell) ───────────────────────────────────────────────────

function QuizView({
  config,
  initialQueue,
  script,
  onBack,
}: {
  config: QuizConfig;
  initialQueue: QuizItem[] | null;
  script: KanaScript;
  onBack: () => void;
}) {
  const [finalResults, setFinalResults] = useState<KanaResult[] | null>(null);

  if (finalResults) {
    return (
      <QuizResultScreen
        results={finalResults}
        config={config}
        onBack={onBack}
        onPracticeMistakes={() => {
          const wrongKana = finalResults.filter((r) => !r.isCorrect).map((r) => r.kana);
          if (wrongKana.length === 0) return;
          setFinalResults(null);
        }}
        onPracticeAgain={() => setFinalResults(null)}
      />
    );
  }

  return (
    <FlashcardSession
      config={config}
      initialQueue={initialQueue}
      script={script}
      onComplete={setFinalResults}
      onBack={onBack}
    />
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function QuizStatsBar({
  accuracy,
  remaining,
  incorrect,
  total,
  onBack,
}: {
  accuracy: number;
  remaining: number;
  incorrect: number;
  total: number;
  onBack: () => void;
}) {
  return (
    <div className="sticky top-[4.25rem] z-20 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-2 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="ml-auto flex gap-6">
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Remaining" value={String(remaining)} />
          <Stat label="Incorrect" value={`${incorrect}/${total}`} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

// ── Flashcard session ─────────────────────────────────────────────────────────

type FeedbackPhase = "idle" | "wrong" | "revealed";

function FlashcardSession({
  config,
  initialQueue,
  script,
  onComplete,
  onBack,
}: {
  config: QuizConfig;
  initialQueue: QuizItem[] | null;
  script: KanaScript;
  onComplete: (results: KanaResult[]) => void;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();

  const [queue, setQueue] = useState<QuizItem[]>(() => initialQueue ?? buildQueue(config));
  const [inputValue, setInputValue] = useState("");
  const [feedbackPhase, setFeedbackPhase] = useState<FeedbackPhase>("idle");
  const [stats, setStats] = useState({ totalSeen: 0, correctFirst: 0, incorrectCount: 0 });

  // Per-kana tracking (not in state — no re-render needed)
  const firstAttemptRef = useRef<Map<string, boolean>>(new Map()); // kana → isCorrect
  const wasRevealedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const totalUniqueRef = useRef(0);

  const current = queue[0];

  // Persist session on queue changes
  useEffect(() => {
    if (queue.length > 0) saveSession(queue, config);
  }, [queue, config]);

  // Auto-focus on mount and after each advance
  useEffect(() => {
    if (feedbackPhase === "idle") inputRef.current?.focus();
  }, [current, feedbackPhase]);

  // Space key → reveal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space" && feedbackPhase === "idle") {
        e.preventDefault();
        handleReveal();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function recordFirstAttempt(kana: string, isCorrect: boolean) {
    if (firstAttemptRef.current.has(kana)) return; // already recorded
    firstAttemptRef.current.set(kana, isCorrect);
    totalUniqueRef.current++;
    setStats((s) => ({
      totalSeen: s.totalSeen + 1,
      correctFirst: s.correctFirst + (isCorrect ? 1 : 0),
      incorrectCount: s.incorrectCount + (isCorrect ? 0 : 1),
    }));
  }

  function handleSubmit() {
    if (!inputValue.trim() || !current || feedbackPhase !== "idle") return;
    const isCorrect = checkRomaji(inputValue, current.romaji);
    const isFirstCorrect = isCorrect && !wasRevealedRef.current;
    recordFirstAttempt(current.kana, isFirstCorrect);

    if (isCorrect) {
      advance(false);
    } else {
      setFeedbackPhase("wrong");
    }
  }

  function handleReveal() {
    if (!current || feedbackPhase !== "idle") return;
    wasRevealedRef.current = true;
    recordFirstAttempt(current.kana, false);
    setFeedbackPhase("revealed");
  }

  function handleGotIt() {
    advance(false);
  }
  function handleNeedMore() {
    advance(true);
  }
  function handleNext() {
    advance(true);
  } // after wrong

  async function advance(requeue: boolean) {
    const newQueue = requeue ? [...queue.slice(1), queue[0]] : queue.slice(1);
    wasRevealedRef.current = false;
    setInputValue("");
    setFeedbackPhase("idle");

    if (newQueue.length === 0) {
      clearSession();
      const results: KanaResult[] = Array.from(firstAttemptRef.current.entries()).map(
        ([kana, isCorrect]) => ({
          kana,
          isCorrect,
          section: getSectionForKana(config.script, kana) ?? "basic",
        }),
      );

      // Submit to backend (grouped by section)
      await submitBySection(results, config.script);
      queryClient.invalidateQueries({ queryKey: ["kanaProgress"] });
      queryClient.invalidateQueries({ queryKey: ["kanaItems"] });
      onComplete(results);
      return;
    }

    setQueue(newQueue);
  }

  const accuracy =
    stats.totalSeen > 0 ? Math.round((stats.correctFirst / stats.totalSeen) * 100) : 0;

  if (!current) return null;

  return (
    <div className="min-h-screen">
      <QuizStatsBar
        accuracy={accuracy}
        remaining={queue.length}
        incorrect={stats.incorrectCount}
        total={totalUniqueRef.current}
        onBack={onBack}
      />

      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-12">
        {/* Kana display */}
        <div className="flex items-center gap-3">
          <span className="text-8xl sm:text-9xl leading-none">{current.kana}</span>
          <button
            type="button"
            onClick={() => speakKana(current.kana)}
            aria-label="Hear pronunciation"
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        </div>

        {/* Input area */}
        {feedbackPhase === "idle" && (
          <div className="w-full max-w-xs space-y-3">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Type romaji..."
              className="text-center text-lg"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="flex justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleReveal}>
                Reveal Answer
              </Button>
              <span className="self-center text-xs text-muted-foreground">or Space</span>
            </div>
          </div>
        )}

        {/* Wrong feedback */}
        {feedbackPhase === "wrong" && (
          <div className="w-full max-w-xs space-y-3 text-center">
            <p className="text-sm text-red-500">✗ Incorrect — correct answer:</p>
            <p className="text-3xl font-bold text-foreground">{current.romaji}</p>
            <Button className="w-full" onClick={handleNext}>
              Next →
            </Button>
          </div>
        )}

        {/* Revealed feedback */}
        {feedbackPhase === "revealed" && (
          <div className="w-full max-w-xs space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Answer:</p>
            <p className="text-3xl font-bold">{current.romaji}</p>
            <div className="flex gap-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleGotIt}>
                ✓ Got it
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleNeedMore}>
                ✗ Need more
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Submit helpers ────────────────────────────────────────────────────────────

async function submitBySection(results: KanaResult[], script: KanaScript) {
  const bySection = new Map<KanaSection, KanaResult[]>();
  for (const r of results) {
    const existing = bySection.get(r.section) ?? [];
    bySection.set(r.section, [...existing, r]);
  }
  await Promise.allSettled(
    Array.from(bySection.entries()).map(([section, items]) =>
      submitKanaAttempt({
        clientAttemptId: crypto.randomUUID(),
        script,
        section,
        score: items.filter((r) => r.isCorrect).length,
        total: items.length,
        answers: items.map(({ kana, isCorrect }) => ({ kana, isCorrect })),
      }),
    ),
  ).catch(() => toast.error("Could not save progress. Please check your connection."));
}

// ── Quiz result screen ────────────────────────────────────────────────────────

function QuizResultScreen({
  results,
  config,
  onBack,
  onPracticeMistakes,
  onPracticeAgain,
}: {
  results: KanaResult[];
  config: QuizConfig;
  onBack: () => void;
  onPracticeMistakes: () => void;
  onPracticeAgain: () => void;
}) {
  const correct = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  const incorrect = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongItems = results.filter((r) => !r.isCorrect);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold">Quiz Complete</h2>
        <p className="text-muted-foreground text-sm">
          {config.script === "hiragana" ? "Hiragana" : "Katakana"} ·{" "}
          {config.section === "all" ? "All sections" : config.section}
        </p>
      </div>

      <Card className="grid grid-cols-4 divide-x p-0 overflow-hidden">
        {[
          { label: "Total", value: total },
          { label: "Correct", value: correct, className: "text-green-600" },
          { label: "Incorrect", value: incorrect, className: "text-red-500" },
          { label: "Accuracy", value: `${accuracy}%` },
        ].map(({ label, value, className }) => (
          <div key={label} className="flex flex-col items-center py-4">
            <span className={`text-2xl font-bold ${className ?? ""}`}>{value}</span>
            <span className="text-xs text-muted-foreground mt-1">{label}</span>
          </div>
        ))}
      </Card>

      {wrongItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Needs practice ({wrongItems.length})</p>
          <div className="flex flex-wrap gap-2">
            {wrongItems.map((r) => (
              <button
                key={r.kana}
                type="button"
                onClick={() => speakKana(r.kana)}
                className="flex flex-col items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 hover:bg-red-100 dark:bg-red-950/30"
              >
                <span className="text-xl">{r.kana}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {wrongItems.length > 0 && (
          <Button className="w-full" onClick={onPracticeMistakes}>
            Practice Mistakes ({wrongItems.length})
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={onPracticeAgain}>
          Practice Again
        </Button>
        <Button variant="ghost" className="w-full" onClick={onBack}>
          ← Back to Chart
        </Button>
      </div>
    </div>
  );
}
