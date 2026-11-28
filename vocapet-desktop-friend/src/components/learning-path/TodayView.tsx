import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Clock,
  Flame,
  GraduationCap,
  Lock,
  Moon,
  Play,
  Repeat,
  Star,
  Unlock,
  X,
} from "lucide-react";
import { Cat } from "@/components/ref/Cat";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import type {
  CalendarDay,
  PathItemType,
  PathPace,
  PhaseView,
  TodayResponse,
  UnitKind,
  UnlockStatus,
} from "@/api/learning-path.api";
import {
  usePathReviewQueueQuery,
  useUnitsQuery,
  useSaveProfileMutation,
  useSetPaceMutation,
  useTodayQuery,
} from "@/hooks/queries/learning-path.queries";
import { useReviewQueueQuery } from "@/hooks/queries/learning.queries";
import { dayLabelVi, formatViDate, weekdayVi } from "@/lib/learning-path/dates";
import { MarkedTitle, Seal } from "./studio";

const TYPE_LABEL: Record<PathItemType, string> = {
  KANA: "kana",
  GRAMMAR: "ngữ pháp",
  VOCAB: "từ vựng",
  KANJI: "kanji",
};
const STATUS_LABEL = { NOT_STARTED: "Chưa làm", IN_PROGRESS: "Đang làm", DONE: "Xong" } as const;
/** The four phases are a real sequence, so they carry their order as Japanese numerals. */
const NUMERAL = ["一", "二", "三", "四", "五"];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** "5 kana · 2 từ vựng" for learn/review phases, "12 câu" for practice and test. */
function summary(p: PhaseView) {
  if (p.phase === "PRACTICE" || p.phase === "TEST") return `${p.items.length} câu`;
  if (p.phase === "REVIEW") return `${p.items.length} nội dung`;
  return (Object.entries(p.counts) as [PathItemType, number][])
    .map(([t, n]) => `${n} ${TYPE_LABEL[t]}`)
    .join(" · ");
}

/** Today: what to learn, why, how long, and what comes next. One main action. */
export function TodayView() {
  const today = useTodayQuery();
  if (today.isPending)
    return (
      <div className="mx-auto max-w-[1120px]">
        <LoadingBlock rows={4} />
      </div>
    );
  if (today.isError)
    return (
      <div className="mx-auto max-w-[1120px]">
        <ErrorBlock error={today.error} onRetry={() => today.refetch()} />
      </div>
    );
  return <Today t={today.data} />;
}

function Today({ t }: { t: TodayResponse }) {
  const { data: me } = useMeQuery();
  const phases = t.phases;
  const next = phases.find((p) => p.phase === t.nextPhase);
  const withItems = phases.filter((p) => p.items.length > 0);
  const empty = phases.filter((p) => p.items.length === 0);
  const started = withItems.some((p) => p.status !== "NOT_STARTED");
  const f = t.focus;
  const rest = t.kind === "REST" && !next;
  const cycleNote = t.kind !== "WEEKLY_TEST" ? t.cycleNote : null;
  const dateLine = new Date(`${t.date}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const sub = rest
    ? "Hôm nay là ngày nghỉ theo lịch. Muốn học thêm thì cứ chọn bài bên dưới nhé."
    : t.completed
      ? "Bạn đã xong kế hoạch hôm nay. Học tiếp hay ôn tập đều được."
      : started && next
        ? `Mình học tiếp phần ${next.label.toLowerCase()} nhé.`
        : "Hôm nay chúng ta học gì nhé?";

  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      {/* A · Welcome: compact, one line of stats. */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] studio-muted">
            {dateLine}
          </p>
          <h1 className="studio-head text-3xl leading-tight sm:text-4xl">
            Chào {me?.name || "bạn"}! <span aria-hidden>👋</span>
          </h1>
          <p className="text-[0.9375rem] studio-muted">{sub}</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold" aria-label="Thành tích">
          <span className="ref-chip gap-1.5 text-streak" title="Chuỗi ngày học">
            <Flame aria-hidden className="h-4 w-4" />
            <span className="tabular-nums text-foreground">{me?.streak ?? t.streak}</span>
            <span className="sr-only">ngày liên tiếp</span>
          </span>
          {me?.level != null && (
            <span className="ref-chip gap-1.5 text-xp" title="Cấp độ">
              <Star aria-hidden className="h-4 w-4" />
              <span className="tabular-nums text-foreground">Lv {me.level}</span>
            </span>
          )}
          <span className="ref-chip gap-1.5" title="Trình độ lộ trình">
            <GraduationCap aria-hidden className="h-4 w-4 text-primary" />
            <span className="text-foreground">{t.profile.targetLevel}</span>
          </span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-6">
          {/* B · Today's learning: the plan, or its result once done. */}
          {t.completed ? (
            <DoneToday t={t} />
          ) : rest ? (
            <RestDay t={t} />
          ) : (
            next && (
              <section
                aria-labelledby="plan-today"
                className="ref-card ref-scene relative p-6 sm:p-7"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 sm:pr-[min(30%,10rem)]">
                  <span className="ref-pill">Kế hoạch hôm nay</span>
                  <span className="flex items-center gap-1.5 text-sm studio-muted">
                    <Clock aria-hidden className="h-4 w-4" /> {t.totalMinutes} phút ·{" "}
                    {withItems.filter((p) => p.status === "DONE").length}/{withItems.length} phần
                    xong
                  </span>
                </div>
                <h2
                  id="plan-today"
                  className="studio-head mt-3 text-2xl leading-snug sm:pr-[min(30%,10rem)]"
                >
                  <MarkedTitle text={f.objective} />
                </h2>
                {f.why && (
                  <p className="mt-1 max-w-[56ch] text-sm studio-muted sm:pr-[min(30%,10rem)]">
                    {f.why}
                  </p>
                )}
                <ol className="studio-rule-t mt-4 sm:mr-[min(30%,10rem)]">
                  {phases.map((p, i) =>
                    p.items.length === 0 ? null : (
                      <PhaseRow key={p.phase} p={p} n={NUMERAL[i]} isNext={p === next} t={t} />
                    ),
                  )}
                </ol>
                {empty.length > 0 && (
                  <p className="mt-2 text-xs studio-muted">
                    Hôm nay không có phần {empty.map((p) => p.label.toLowerCase()).join(", ")}.
                  </p>
                )}
                <Link
                  to="/app/path/study"
                  search={{ phase: next.phase }}
                  className="studio-btn mt-5 min-h-12 w-full max-w-[22rem] justify-center px-8"
                >
                  {started ? "Học tiếp" : "Bắt đầu học ngay"}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <Cat
                  pose="read"
                  className="pointer-events-none absolute -bottom-2 right-2 hidden w-[min(28%,10rem)] drop-shadow-[0_10px_14px_rgba(52,66,48,0.18)] sm:block"
                />
              </section>
            )
          )}

          {cycleNote || (t.reducedNew && t.kind === "LESSON") ? (
            <div className="space-y-3">
              {cycleNote && (
                <p className="studio-note text-sm">
                  <b>Sau bài kiểm tra tuần:</b> {cycleNote}
                </p>
              )}
              {t.reducedNew && t.kind === "LESSON" && (
                <p className="studio-note text-sm">
                  Hôm nay bớt bài mới để bạn có thêm thời gian củng cố phần cũ.
                </p>
              )}
            </div>
          ) : null}

          {/* C · Continue learning: the next unlocked lesson, whatever day it is planned for. */}
          <ContinueLearning t={t} />
          <AheadNote t={t} />
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Ôn tập và lộ trình">
          {/* D · Review */}
          <ReviewCard />
          {/* F · Path summary */}
          <PathSummary t={t} />
        </aside>
      </div>

      {/* E · Explore */}
      <ExploreLinks />

      {/* G · The week, as a habit tracker, plus pace: secondary. */}
      <section aria-label="Lịch tuần" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="ref-card p-5">
          <WeekStrip days={t.week} todayDone={t.completed} />
        </div>
        <div className="ref-card space-y-4 p-5">
          {t.profile.pace && <PaceSetting pace={t.profile.pace} />}
          <Link to="/app/path/setup" className="studio-link text-sm">
            Sửa thiết lập lộ trình
          </Link>
        </div>
      </section>
    </div>
  );
}

const UNIT_KIND_LABEL: Record<UnitKind, string> = {
  LEARN: "Bài học",
  REVIEW: "Bài ôn",
  TEST: "Bài kiểm tra",
};

/**
 * The next unlocked lesson (AVAILABLE or IN_PROGRESS) from the lesson states: always a definite answer, never an
 * open-ended "searching". When it is today's own lesson, the plan card above already covers it, so this says what opens after.
 */
function ContinueLearning({ t }: { t: TodayResponse }) {
  const q = useUnitsQuery();
  if (q.isPending)
    return (
      <section aria-label="Học tiếp" className="ref-card p-6">
        <LoadingBlock rows={2} label="Đang tải bài học tiếp theo…" />
      </section>
    );
  if (q.isError)
    return (
      <section aria-labelledby="continue" className="ref-card space-y-2 p-6">
        <h2 id="continue" className="studio-head text-xl">
          Học tiếp
        </h2>
        <p role="alert" className="text-sm">
          Chưa tải được danh sách bài học.{" "}
          <button type="button" className="studio-link" onClick={() => q.refetch()}>
            Thử lại
          </button>
        </p>
      </section>
    );
  const units = q.data.units;
  const nextIndex = units.findIndex((u) => u.id === q.data.nextUnitId);
  const unit = units[nextIndex];
  if (!unit)
    return (
      <section aria-labelledby="continue" className="ref-card space-y-3 p-6">
        <h2 id="continue" className="studio-head text-xl">
          Học tiếp
        </h2>
        <p className="text-sm">
          Bạn đã hoàn thành mọi bài của lộ trình {t.profile.targetLevel}. Ôn tập đều để giữ vững
          kiến thức nhé.
        </p>
        <Link to="/app/review" className="studio-btn">
          <Repeat aria-hidden className="h-4 w-4" /> Ôn tập
        </Link>
      </section>
    );
  // Today's unfinished lesson is the next one: the plan card starts it; show what it unlocks instead of repeating it.
  const todays = unit.inToday && !t.completed;
  const after = units.slice(nextIndex + 1).find((u) => u.status !== "COMPLETED");
  const shown = todays && after ? after : unit;
  const open = shown.status === "AVAILABLE" || shown.status === "IN_PROGRESS";
  const later = shown.scheduledFor && shown.scheduledFor > t.date;
  const reviewFirst = open && !todays && !!t.advice?.kind;
  return (
    <section aria-labelledby="continue" className="ref-card space-y-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="continue" className="studio-head text-xl">
          {todays ? "Sau bài hôm nay" : "Học tiếp"}
        </h2>
        <UnlockBadge status={shown.status} />
      </div>
      <div className="space-y-1">
        <p className="text-xs studio-muted">
          {UNIT_KIND_LABEL[shown.kind]}
          {shown.chapterTitle ? ` · Chặng ${shown.chapterTitle}` : ""} · khoảng{" "}
          {shown.estimatedMinutes} phút
        </p>
        <p className="text-lg font-semibold">{shown.title}</p>
        {shown.status === "IN_PROGRESS" && shown.kind === "LEARN" && (
          <p className="text-sm studio-muted">
            Đã học {shown.itemsLearned}/{shown.itemsTotal} nội dung
          </p>
        )}
      </div>
      {todays && !open ? (
        <p className="text-sm studio-muted">
          Mở ngay khi bạn học xong “{unit.title}” ở kế hoạch hôm nay, không cần chờ đến ngày mai.
        </p>
      ) : open && later ? (
        <p className="studio-note text-sm">
          Bài học này được lên lịch vào {dayLabelVi(shown.scheduledFor!, t.date)}, nhưng bạn có thể
          học ngay.
        </p>
      ) : null}
      {reviewFirst && (
        <p className="studio-note text-sm">
          {t.advice?.kind === "LOW_ACCURACY"
            ? `Gần đây bạn trả lời đúng khoảng ${Math.round((t.advice.recentAccuracy ?? 0) * 100)}% khi ôn. Ôn lại trước sẽ giúp bài mới vào đầu dễ hơn.`
            : `Bạn có ${t.advice?.dueReviews} thẻ đến hạn, nhiều hơn một buổi ôn. Nên ôn bớt trước khi học bài mới.`}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {reviewFirst && (
          <Link to="/app/review" className="studio-btn">
            <Repeat aria-hidden className="h-4 w-4" /> Ôn tập trước
          </Link>
        )}
        {open && (
          <Link
            to="/app/path/study"
            search={{ phase: "UNIT", unit: shown.id }}
            className={`studio-btn ${todays || reviewFirst ? "studio-btn-quiet" : ""}`}
          >
            {shown.status === "IN_PROGRESS"
              ? "Tiếp tục học"
              : shown.kind === "LEARN"
                ? "Bắt đầu học"
                : "Làm bài"}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );
}

export function UnlockBadge({ status }: { status: UnlockStatus }) {
  const v = {
    COMPLETED: {
      text: "Đã hoàn thành",
      cls: "bg-primary text-primary-foreground",
      icon: <Check aria-hidden className="h-3.5 w-3.5" />,
    },
    IN_PROGRESS: {
      text: "Đang học",
      cls: "bg-[color-mix(in_oklab,var(--p-blossom)_70%,transparent)] text-foreground",
      icon: <Play aria-hidden className="h-3.5 w-3.5" />,
    },
    AVAILABLE: {
      text: "Đã mở khóa",
      cls: "bg-primary-soft text-primary",
      icon: <Unlock aria-hidden className="h-3.5 w-3.5" />,
    },
    LOCKED: {
      text: "Chưa mở khóa",
      cls: "bg-muted text-muted-foreground",
      icon: <Lock aria-hidden className="h-3.5 w-3.5" />,
    },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${v.cls}`}
    >
      {v.icon}
      {v.text}
    </span>
  );
}

/** D · Due cards across the SRS (words, kana, grammar, kanji). Kept small: a count and the way in. */
function ReviewCard() {
  const due = useDueCount();
  return (
    <Link
      to="/app/review"
      className="ref-card flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5"
    >
      <span
        aria-hidden
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"
      >
        <Repeat className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Ôn tập</span>
        <span className="block text-sm studio-muted">
          {due > 0 ? `${due} thẻ cần ôn` : "Chưa có thẻ đến hạn"}
        </span>
      </span>
      <ArrowRight aria-hidden className="h-4 w-4 text-primary" />
    </Link>
  );
}

/** F · Overall progress, the current stage, the way to the full roadmap. */
function PathSummary({ t }: { t: TodayResponse }) {
  const units = useUnitsQuery();
  const current = units.data?.units.find((u) => u.id === units.data?.nextUnitId);
  // Measured speed when there is enough study to measure it, the plan's projection before that.
  const pace = t.actualPace ?? null;
  const estimate = pace ? pace.estimatedFinish : t.feasibility.estimatedFinish;
  const behind = !t.feasibility.feasible || !!pace?.behindTarget;
  return (
    <section aria-labelledby="journey" className="ref-card space-y-3 p-5">
      <h2 id="journey" className="studio-head text-lg">
        Lộ trình {t.profile.targetLevel}
      </h2>
      <div
        className="studio-bar"
        role="progressbar"
        aria-label="Tiến độ lộ trình"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={t.progressPercent}
      >
        <span style={{ width: `${t.progressPercent}%` }} />
      </div>
      <p className="text-sm studio-muted">
        Đã nắm {t.itemsUnderstood}/{t.itemsTotal} nội dung ({t.progressPercent}%)
      </p>
      {current?.chapterTitle && (
        <p className="text-sm">
          Chặng hiện tại: <b>{current.chapterTitle}</b>
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
        <div>
          <dt className="text-xs studio-muted">Hạn mục tiêu</dt>
          <dd className="font-semibold">{formatViDate(t.profile.targetDate)}</dd>
        </div>
        <div>
          <dt className="text-xs studio-muted">
            {pace ? "Dự kiến theo tốc độ thật" : "Dự kiến theo kế hoạch"}
          </dt>
          <dd className={`font-semibold ${behind ? "text-destructive" : ""}`}>
            {estimate ? formatViDate(estimate) : "Chưa đủ dữ liệu"}
          </dd>
        </div>
      </dl>
      {pace && (
        <p className="text-xs studio-muted">
          Khoảng {pace.itemsPerStudyDay} nội dung mới mỗi ngày học ({pace.sampleStudyDays} ngày gần
          đây).
        </p>
      )}
      {behind && <BehindNotice t={t} estimate={estimate} />}
      <Link to="/app/path/roadmap" className="studio-btn studio-btn-quiet -ml-3">
        Xem toàn bộ lộ trình <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </section>
  );
}

const EXPLORE = [
  { to: "/app/library", label: "Thư viện", jp: "本" },
  { to: "/app/japanese/kana", label: "Kana", jp: "あ" },
  { to: "/app/japanese/tango", label: "Từ vựng", jp: "語" },
  { to: "/app/japanese/grammar", label: "Ngữ pháp", jp: "文" },
  { to: "/app/japanese/kanji", label: "Kanji", jp: "字" },
] as const;

/** E · Free exploration, outside the path. */
function ExploreLinks() {
  return (
    <section aria-labelledby="explore" className="space-y-3">
      <h2 id="explore" className="studio-kicker studio-kicker-muted">
        Khám phá thêm
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {EXPLORE.map((e) => (
          <li key={e.to}>
            <Link
              to={e.to}
              className="ref-card flex min-h-14 items-center gap-3 px-4 py-3 transition-transform hover:-translate-y-0.5"
            >
              <span lang="ja" aria-hidden className="studio-jp text-xl text-primary">
                {e.jp}
              </span>
              <span className="font-semibold">{e.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PhaseRow({
  p,
  n,
  isNext,
  t,
}: {
  p: PhaseView;
  n: string;
  isNext: boolean;
  t: TodayResponse;
}) {
  const done = p.status === "DONE";
  return (
    <li>
      <Link
        to="/app/path/study"
        search={{ phase: p.phase }}
        aria-current={isNext ? "step" : undefined}
        className={`studio-row studio-rule-b grid min-h-16 grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-2 py-3 ${
          isNext ? "rounded-xl bg-primary-soft/70" : ""
        }`}
      >
        <span
          lang="ja"
          aria-hidden
          className={`studio-jp text-xl ${isNext || done ? "text-primary" : "studio-muted"}`}
        >
          {n}
        </span>
        <span className="min-w-0">
          <span className={`block ${isNext ? "font-semibold" : ""}`}>{p.label}</span>
          <span className="block text-sm studio-muted">
            {summary(p)} · {p.minutes} phút
            {p.phase === "TEST" &&
              t.test?.finalScore != null &&
              ` · ${Math.round(t.test.finalScore * 100)}%`}
          </span>
        </span>
        <span className="text-xs">
          {done ? (
            <Seal state="done" size={1.75} label="Xong" />
          ) : (
            <span className={isNext ? "font-semibold text-primary" : "studio-muted"}>
              {isNext ? "Tiếp theo" : STATUS_LABEL[p.status]}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/** Monday–Sunday: 済 on finished days, 試 on test days, an outline for today, dashed slots for the rest. */
type DayState = "done" | "today" | "missed" | "rest" | "test" | "upcoming" | "none";

const DAY_ICON: Record<DayState, { text: string; cls: string; icon: React.ReactNode }> = {
  done: {
    text: "Đã học",
    cls: "bg-primary text-primary-foreground",
    icon: <Check aria-hidden className="h-4 w-4" strokeWidth={3} />,
  },
  today: {
    text: "Hôm nay",
    cls: "border-2 border-primary bg-background text-primary",
    icon: <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-primary" />,
  },
  missed: {
    text: "Bỏ lỡ",
    cls: "bg-destructive/10 text-destructive",
    icon: <X aria-hidden className="h-4 w-4" strokeWidth={2.5} />,
  },
  rest: {
    text: "Nghỉ",
    cls: "bg-muted text-muted-foreground",
    icon: <Moon aria-hidden className="h-4 w-4" />,
  },
  test: {
    text: "Kiểm tra",
    cls: "border border-dashed border-primary/60 text-primary",
    icon: <Star aria-hidden className="h-4 w-4" />,
  },
  upcoming: {
    text: "Sắp tới",
    cls: "border border-dashed border-border text-transparent",
    icon: null,
  },
  none: { text: "", cls: "border border-dashed border-border/50 text-transparent", icon: null },
};

/** The week as one glance: a check for days studied, a ring for today, a cross for missed days, a moon for rest. */
function WeekStrip({ days, todayDone }: { days: CalendarDay[]; todayDone: boolean }) {
  const states = days.map((d): DayState => {
    const today = d.status === "TODAY";
    if (d.status === "DONE" || (today && todayDone)) return "done";
    if (d.status === "NONE") return "none";
    if (d.status === "REST" || d.kind === "REST") return "rest";
    if (d.status === "MISSED") return "missed";
    if (today) return "today";
    return d.kind === "WEEKLY_TEST" ? "test" : "upcoming";
  });
  const studied = states.filter((s) => s === "done").length;
  return (
    <section aria-labelledby="week" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="week" className="studio-kicker studio-kicker-muted">
          Tuần này
        </h2>
        <p className="text-xs studio-muted">Đã học {studied} ngày</p>
      </div>
      <ol className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((d, i) => {
          const st = states[i];
          const v = DAY_ICON[st];
          const today = d.status === "TODAY";
          return (
            <li
              key={d.date}
              title={d.title ?? undefined}
              className={`grid justify-items-center gap-1 rounded-[var(--radius)] py-2 ${today ? "bg-primary/5 font-semibold" : "studio-muted"}`}
            >
              <span aria-hidden>{WEEKDAYS[i]}</span>
              <span
                role="img"
                aria-label={`${WEEKDAYS[i]}: ${v.text.toLowerCase()}`}
                className={`grid h-8 w-8 place-items-center rounded-full ${v.cls}`}
              >
                {v.icon}
              </span>
              <span aria-hidden className="tabular-nums">
                {Number(d.date.slice(8))}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs studio-muted">
        {(["done", "today", "missed", "rest"] as DayState[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              className={`grid h-4 w-4 place-items-center rounded-full ${DAY_ICON[k].cls} [&_svg]:h-2.5 [&_svg]:w-2.5 [&>span]:h-1.5 [&>span]:w-1.5`}
            >
              {DAY_ICON[k].icon}
            </span>
            {DAY_ICON[k].text}
          </span>
        ))}
      </p>
    </section>
  );
}

function useDueCount() {
  const words = useReviewQueueQuery(100);
  const path = usePathReviewQueueQuery();
  return (words.data?.length ?? 0) + (path.data?.length ?? 0);
}

/** Rest day: no empty task list; the calendar carries on tomorrow, optional review if anything is due. */
function RestDay({ t }: { t: TodayResponse }) {
  const due = useDueCount();
  const f = t.focus;
  return (
    <section className="ref-card ref-scene relative space-y-5 p-7 pr-[min(40%,14rem)]">
      <Cat
        pose="sleep"
        className="pointer-events-none absolute bottom-4 right-6 w-[min(30%,10rem)]"
      />
      <p className="max-w-[60ch] text-[0.9375rem] studio-muted">
        Lịch học tiếp tục {f.nextDate ? `vào ${weekdayVi(f.nextDate)}` : "vào ngày học kế tiếp"}.
        Không có bài bắt buộc hôm nay.
      </p>
      <div className="flex flex-wrap gap-3">
        {due > 0 && (
          <Link to="/app/review" className="studio-btn">
            Ôn {due} nội dung đến hạn
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        )}
        <Link to="/app/path/roadmap" className="studio-btn studio-btn-quiet">
          Xem trước bài kế tiếp
        </Link>
      </div>
      {due > 0 && <p className="text-sm studio-muted">Ôn hôm nay là tuỳ chọn.</p>}
    </section>
  );
}

const PACES: { id: PathPace; label: string; hint: string }[] = [
  { id: "RELAXED", label: "Thong thả", hint: "Làm đúng kế hoạch, ưu tiên ôn tập" },
  { id: "FLEXIBLE", label: "Linh hoạt", hint: "Gợi ý học tiếp khi bạn còn sức" },
  { id: "FAST_TRACK", label: "Tăng tốc", hint: "Gợi ý nhiều bài hơn, vẫn theo thứ tự" },
];

/** Learned-ahead units whose planned day has not passed: shown as done, never as new work. */
function AheadNote({ t }: { t: TodayResponse }) {
  if (!t.learnedAhead?.length) return null; // absent when the frontend is newer than the backend
  return (
    <p className="studio-note text-sm">
      <b>Đã học trước:</b>{" "}
      {t.learnedAhead
        .map((a) => a.title + (a.scheduledFor ? ` (dự kiến ${formatViDate(a.scheduledFor)})` : ""))
        .join("; ")}
      . Mình sẽ không xếp lại những bài này.
    </p>
  );
}

function PaceSetting({ pace }: { pace: PathPace }) {
  const set = useSetPaceMutation();
  const failed = set.isError;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] studio-muted">Tốc độ học</p>
      <div role="radiogroup" aria-label="Tốc độ học" className="flex flex-wrap gap-2">
        {PACES.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={pace === p.id}
            title={p.hint}
            disabled={set.isPending}
            onClick={() => pace !== p.id && set.mutate(p.id)}
            className={`studio-btn min-h-9 px-3 text-sm ${pace === p.id ? "" : "studio-btn-quiet"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-xs studio-muted">{PACES.find((p) => p.id === pace)?.hint}</p>
      {failed && (
        <p role="alert" className="text-xs text-destructive">
          Chưa đổi được tốc độ học, thử lại nhé.
        </p>
      )}
    </div>
  );
}

/** Everything done: the day is stamped; suggests extra review when anything is still due. */
function DoneToday({ t }: { t: TodayResponse }) {
  const score = t.test?.finalScore;
  return (
    <section className="ref-card ref-scene relative space-y-5 p-7 pr-[min(40%,14rem)]">
      <Cat
        pose="cheer"
        className="pointer-events-none absolute bottom-4 right-6 w-[min(28%,9rem)]"
      />
      <div className="flex items-center gap-4">
        <Seal state="done" size={3.5} stamp label="Đã hoàn thành hôm nay" />
        <p className="text-[0.9375rem]">
          Bạn đã hoàn thành buổi học ngày {t.dayNumber}
          {score != null && (
            <>
              , bài kiểm tra đạt <b>{Math.round(score * 100)}%</b>
            </>
          )}
          .
        </p>
      </div>
    </section>
  );
}

/** Gentle "behind schedule" note under the lesson; the learner picks the fix. */
function BehindNotice({ t, estimate }: { t: TodayResponse; estimate: string | null }) {
  const save = useSaveProfileMutation();
  const f = t.feasibility;
  // Plan infeasible: the engine's suggestion. Plan fine but real speed slower: move the date to where that speed ends.
  const newDate = !f.feasible ? f.suggestedTargetDate : estimate;
  const apply = (patch: Partial<TodayResponse["profile"]>) => {
    const { currentLevel, goal, minutesPerDay, daysPerWeek, targetDate, timezone } = {
      ...t.profile,
      ...patch,
    };
    save.mutate({ currentLevel, goal, minutesPerDay, daysPerWeek, targetDate, timezone });
  };
  return (
    <div className="studio-note space-y-3 text-sm">
      <p>
        {estimate ? (
          <>
            Với tốc độ hiện tại, bạn sẽ xong khoảng <b>{formatViDate(estimate)}</b>, sau hạn{" "}
            {formatViDate(t.profile.targetDate)}.
          </>
        ) : (
          <>
            Gần đây bạn chưa học bài mới nên chưa thể kịp hạn {formatViDate(t.profile.targetDate)}.
          </>
        )}{" "}
        Hạn của bạn sẽ không tự đổi. Chọn một cách điều chỉnh, hoặc học đều theo kế hoạch để bắt
        kịp:
      </p>
      <div className="flex flex-wrap gap-2">
        {newDate && newDate > t.profile.targetDate && (
          <button
            type="button"
            className="studio-btn studio-btn-quiet"
            disabled={save.isPending}
            onClick={() => apply({ targetDate: newDate })}
          >
            Lùi hạn đến {formatViDate(newDate)}
          </button>
        )}
        {f.suggestedMinutesPerDay > t.profile.minutesPerDay && (
          <button
            type="button"
            className="studio-btn studio-btn-quiet"
            disabled={save.isPending}
            onClick={() => apply({ minutesPerDay: f.suggestedMinutesPerDay })}
          >
            Học {f.suggestedMinutesPerDay} phút/ngày
          </button>
        )}
      </div>
      {save.isError && (
        <p role="alert" className="text-destructive">
          {save.error instanceof Error ? save.error.message : "Chưa lưu được"}
        </p>
      )}
    </div>
  );
}
