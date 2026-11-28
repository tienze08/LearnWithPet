import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { StudyRunner, type RunnerMode } from "@/components/learning-path/StudyRunner";
import { TestRunner } from "@/components/learning-path/TestRunner";
import { checkUnit, getToday, PHASE_ORDER, type Phase } from "@/api/learning-path.api";
import {
  useNextUpQuery,
  useUnitLessonQuery,
  usePathReviewQueueQuery,
  usePathStatusQuery,
  useTodayQuery,
} from "@/hooks/queries/learning-path.queries";
import { usePathContent } from "@/lib/learning-path/content";

/** DUE = grammar/kanji/kana due now, opened from the Review Center (outside today's frozen plan). */
/** AHEAD = the next lesson of the path, learned before its planned day (opened from the finished Today). */
/** UNIT = one lesson opened on its own (?unit=id), from Today or the roadmap: learn, resume, revisit or take its check. */
type StudyPhase = Phase | "DUE" | "AHEAD" | "UNIT";
const PHASES: StudyPhase[] = [...PHASE_ORDER, "DUE", "AHEAD", "UNIT"];
/** Links from before phases existed used ?block=GRAMMAR|VOCAB|KANJI|REVIEW. */
const LEGACY: Record<string, StudyPhase> = {
  GRAMMAR: "LEARN",
  VOCAB: "LEARN",
  KANJI: "LEARN",
  REVIEW: "REVIEW",
};

const UNIT_MODE = {
  LEARN: "Học bài",
  REVISIT: "Xem lại bài đã học",
  CHECK: "Làm bài",
  LOCKED: "Chưa mở khóa",
} as const;

export const Route = createFileRoute("/app/path/study")({
  validateSearch: (s: Record<string, unknown>): { phase: StudyPhase; unit?: string } => ({
    phase: PHASES.includes(s.phase as StudyPhase)
      ? (s.phase as StudyPhase)
      : (LEGACY[String(s.block)] ?? "LEARN"),
    unit: typeof s.unit === "string" ? s.unit : undefined,
  }),
  component: StudyPage,
});

function StudyPage() {
  const { phase, unit } = Route.useSearch();
  const status = usePathStatusQuery();
  const ready = status.data?.enabled === true && status.data.onboarded;
  const today = useTodayQuery(ready && phase !== "DUE" && phase !== "AHEAD" && phase !== "UNIT");
  const nextUp = useNextUpQuery(ready && phase === "AHEAD");
  const unitLesson = useUnitLessonQuery(ready && phase === "UNIT" ? unit : undefined);
  const lessonData = unitLesson.data;
  const due = usePathReviewQueueQuery(ready && phase === "DUE");
  const { content, isLoading, error, refetch } = usePathContent();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const back = phase === "DUE" ? "/app/review" : phase === "UNIT" ? "/app/path/roadmap" : "/app";
  const view = today.data?.phases.find((p) => p.phase === phase);
  const index = PHASE_ORDER.indexOf(phase as Phase);
  const lesson = nextUp.data?.lessons[0];
  const title =
    phase === "DUE"
      ? "Ôn Kana, Ngữ pháp và Kanji"
      : phase === "AHEAD"
        ? "Học trước"
        : phase === "UNIT"
          ? (lessonData?.unit.title ?? "Bài học")
          : view
            ? `${"一二三四"[index] ?? index + 1} · ${view.label}`
            : "";

  // Focus mode: the shell renders nothing around this page, so it brings its own frame.
  const frame = (body: React.ReactNode) => (
    <div className="mx-auto max-w-[760px] space-y-8 px-4 pb-10 pt-4 sm:px-6">{body}</div>
  );
  const pendingOf = {
    DUE: due.isPending,
    AHEAD: nextUp.isPending,
    UNIT: !unit || unitLesson.isPending,
  } as const;
  if (
    status.isPending ||
    isLoading ||
    (pendingOf[phase as keyof typeof pendingOf] ?? today.isPending)
  )
    return frame(<LoadingBlock rows={3} label="Đang chuẩn bị bài học…" />);
  if (!ready)
    return frame(
      <EmptyBlock title="Bạn chưa thiết lập lộ trình học">
        <Link to="/app/path/setup" className="font-semibold text-primary">
          Thiết lập ngay
        </Link>
      </EmptyBlock>,
    );
  const loadError =
    error ??
    (phase === "DUE"
      ? due.error
      : phase === "AHEAD"
        ? nextUp.error
        : phase === "UNIT"
          ? unitLesson.error
          : today.error);
  if (loadError || !content)
    return frame(
      <ErrorBlock
        error={loadError}
        onRetry={() => {
          refetch();
          today.refetch();
          due.refetch();
          nextUp.refetch();
          unitLesson.refetch();
        }}
      />,
    );

  // After a phase, go to the next unfinished one of today, or back to Today.
  const onFinished = async () => {
    if (phase === "DUE") {
      qc.invalidateQueries({ queryKey: ["path"] });
      navigate({ to: "/app/review" });
      return;
    }
    if (phase === "AHEAD" || phase === "UNIT") {
      qc.invalidateQueries({ queryKey: ["path"] });
      navigate({ to: "/app" });
      return;
    }
    const fresh = await qc.fetchQuery({
      queryKey: ["path", "today"],
      queryFn: getToday,
      staleTime: 0,
    });
    qc.invalidateQueries({ queryKey: ["path", "roadmap"] });
    if (fresh.nextPhase && fresh.nextPhase !== phase)
      navigate({ to: "/app/path/study", search: { phase: fresh.nextPhase } });
    else navigate({ to: "/app" });
  };

  const header = (
    <header className="sticky top-0 z-10 -mx-4 flex min-h-14 items-center gap-3 border-b border-border bg-background px-4 sm:-mx-6 sm:px-6">
      <Link
        to={back}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius)] pr-2 text-sm hover:text-primary"
      >
        <X aria-hidden className="h-4 w-4" /> Thoát
      </Link>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-sm font-semibold">{title}</h1>
        {phase === "AHEAD" && lesson && (
          <p className="truncate text-xs studio-muted">{lesson.title}</p>
        )}
        {phase === "UNIT" && lessonData && (
          <p className="truncate text-xs studio-muted">
            {UNIT_MODE[lessonData.mode]}
            {lessonData.unit.chapterTitle ? ` · ${lessonData.unit.chapterTitle}` : ""}
          </p>
        )}
        {phase !== "DUE" && phase !== "AHEAD" && phase !== "UNIT" && today.data && (
          <p className="truncate text-xs studio-muted">{today.data.title}</p>
        )}
      </div>
      <span className="w-16" aria-hidden />
    </header>
  );

  const items =
    phase === "DUE"
      ? (due.data ?? []).map((i) => ({ ...i, done: false }))
      : phase === "AHEAD"
        ? (lesson?.items ?? [])
        : phase === "UNIT"
          ? (lessonData?.items ?? [])
          : (view?.items ?? []);
  if (phase === "UNIT" && lessonData?.mode === "LOCKED")
    return (
      <div className="mx-auto max-w-[760px] space-y-8 px-4 pb-10 sm:px-6">
        {header}
        <EmptyBlock title="Bài này chưa mở khóa">
          <p className="studio-muted">{lessonData.unit.lockedReason}</p>
          <Link to="/app/path/roadmap" className="font-semibold text-primary">
            Xem lộ trình
          </Link>
        </EmptyBlock>
      </div>
    );
  if (items.length === 0)
    return (
      <div className="mx-auto max-w-[760px] space-y-8 px-4 pb-10 sm:px-6">
        {header}
        <EmptyBlock title="Không có nội dung nào ở phần này">
          <Link to={back} className="font-semibold text-primary">
            Quay lại
          </Link>
        </EmptyBlock>
      </div>
    );

  const revisit = phase === "UNIT" && lessonData?.mode === "REVISIT";
  const mode: RunnerMode =
    phase === "PRACTICE" || revisit
      ? "practice"
      : phase === "LEARN" || phase === "AHEAD" || phase === "UNIT"
        ? "learn"
        : "review";
  return (
    <div className="mx-auto max-w-[760px] space-y-8 px-4 pb-10 sm:px-6">
      {header}
      {phase === "UNIT" && lessonData?.mode === "CHECK" ? (
        <TestRunner
          items={items}
          weekly={false}
          test={null}
          content={content}
          title={lessonData.unit.kind === "TEST" ? "Kiểm tra chặng" : "Bài ôn"}
          submit={(_, answers) => checkUnit(lessonData.unit.id, answers)}
          onFinished={onFinished}
        />
      ) : phase === "TEST" ? (
        <TestRunner
          items={items}
          weekly={today.data?.kind === "WEEKLY_TEST"}
          test={today.data?.test ?? null}
          content={content}
          onFinished={onFinished}
        />
      ) : (
        <StudyRunner
          key={phase}
          items={items}
          mode={mode}
          phase={
            phase === "DUE"
              ? "REVIEW"
              : revisit
                ? "PRACTICE"
                : phase === "AHEAD" || phase === "UNIT"
                  ? "LEARN"
                  : phase
          }
          content={content}
          onFinished={onFinished}
        />
      )}
    </div>
  );
}
