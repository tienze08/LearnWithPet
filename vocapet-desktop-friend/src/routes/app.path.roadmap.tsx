import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import type { CalendarDay, ChapterView, PathItemType, UnitState } from "@/api/learning-path.api";
import {
  usePathProfileQuery,
  useRoadmapQuery,
  useUnitsQuery,
} from "@/hooks/queries/learning-path.queries";
import { dayLabelVi, formatViDate, weekdayVi } from "@/lib/learning-path/dates";
import { UnlockBadge } from "@/components/learning-path/TodayView";
import { Seal, stripDayPrefix } from "@/components/learning-path/studio";
import { Cat } from "@/components/ref/Cat";
import { ArrowLeft, ArrowRight, Check, Clock, Flag, GraduationCap, Lock, Play } from "lucide-react";

export const Route = createFileRoute("/app/path/roadmap")({ component: RoadmapPage });

const TYPE_LABEL: Record<PathItemType, string> = {
  KANA: "chữ kana",
  GRAMMAR: "mẫu ngữ pháp",
  VOCAB: "từ vựng",
  KANJI: "chữ kanji",
};
const GOAL_LABEL = {
  PASS_JLPT: "Thi JLPT",
  BASIC_CONVERSATION: "Giao tiếp cơ bản",
  PREPARE_NEXT_LEVEL: "Chuẩn bị lên cấp",
} as const;
const CHAPTER_STATUS = { DONE: "Hoàn thành", ACTIVE: "Đang học", LOCKED: "Chưa mở" } as const;

/** yyyy-mm-dd of the Monday of that date's week. */
function mondayOf(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const dm = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
};

/** The journey: a chapter rail, and the chapter's days grouped by week with their checkpoints. */
function RoadmapPage() {
  const q = useRoadmapQuery();
  const units = useUnitsQuery();
  const profile = usePathProfileQuery();
  const [picked, setPicked] = useState<string | null>(null);
  if (q.isPending)
    return (
      <div className="mx-auto max-w-[1120px]">
        <LoadingBlock rows={6} />
      </div>
    );
  if (q.isError)
    return (
      <div className="mx-auto max-w-[1120px]">
        <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
      </div>
    );
  const r = q.data;
  const minutes = profile.data?.minutesPerDay;
  const byChapter = new Map<string, UnitState[]>();
  for (const u of units.data?.units ?? [])
    if (u.chapterId) byChapter.set(u.chapterId, [...(byChapter.get(u.chapterId) ?? []), u]);
  const nextChapter = units.data?.units.find((u) => u.id === units.data?.nextUnitId)?.chapterId;
  const active =
    r.chapters.find((c) => c.id === nextChapter) ??
    r.chapters.find((c) => c.status === "ACTIVE") ??
    r.chapters[0];
  const chapter = r.chapters.find((c) => c.id === picked) ?? active;
  const chapterIndex = r.chapters.indexOf(chapter);
  const chapterUnits = (chapter && byChapter.get(chapter.id)) ?? [];

  // A day without a chapter id belongs to the chapter of the day before it.
  let carry: string | null = r.chapters[0]?.id ?? null; // leading days (e.g. a rest day 1) go to the first chapter
  const days = r.days.filter((d) => {
    carry = d.chapterId ?? carry;
    return carry === chapter?.id;
  });
  const weeks: { monday: string; days: CalendarDay[] }[] = [];
  for (const d of days) {
    const m = mondayOf(d.date);
    if (weeks.at(-1)?.monday !== m) weeks.push({ monday: m, days: [] });
    weeks.at(-1)!.days.push(d);
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-10">
      <header className="relative min-h-[12rem] space-y-4 sm:pr-[min(36%,20rem)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 right-0 h-64 w-[26rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--p-blossom)_70%,transparent),transparent)]"
        />
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 text-sm studio-muted hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Quay lại
        </Link>
        <h1 className="studio-head text-4xl leading-tight sm:text-[2.75rem]">
          Lộ trình học của bạn
        </h1>
        <p className="max-w-[44ch] text-base studio-muted">
          Dựa trên trình độ và mục tiêu, VocaPet đã tạo cho bạn một lộ trình học cá nhân hóa.
        </p>
        <Cat
          pose="sleep"
          className="pointer-events-none absolute right-4 top-4 hidden w-[min(34%,14rem)] sm:block"
        />
      </header>

      <dl className="grid gap-5 rounded-3xl bg-primary-soft/70 p-5 sm:grid-cols-3 sm:p-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sheet text-primary"
          >
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <dt className="text-xs studio-muted">Trình độ lộ trình</dt>
            <dd className="font-semibold">{r.level}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sheet text-primary"
          >
            <Flag className="h-5 w-5" />
          </span>
          <div>
            <dt className="text-xs studio-muted">Mục tiêu</dt>
            <dd className="font-semibold">
              {profile.data ? GOAL_LABEL[profile.data.goal] : "—"}
              <span className="font-normal studio-muted"> · hạn {formatViDate(r.targetDate)}</span>
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sheet text-primary"
          >
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <dt className="text-xs studio-muted">Thời gian học</dt>
            <dd className="font-semibold">{minutes ? `${minutes} phút/ngày` : "—"}</dd>
          </div>
        </div>
      </dl>

      <div className="grid gap-10 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-14">
        <nav aria-label="Các chặng" className="lg:sticky lg:top-8 lg:self-start">
          <h2 className="sr-only">Các chặng</h2>
          <ol className="relative before:absolute before:bottom-8 before:left-[6.1rem] before:top-8 before:w-px before:bg-border">
            {r.chapters.map((c, i) => (
              <ChapterItem
                key={c.id}
                c={c}
                n={i + 1}
                selected={c.id === chapter?.id}
                onSelect={() => setPicked(c.id)}
                units={byChapter.get(c.id)}
              />
            ))}
          </ol>
        </nav>

        {chapter && (
          <section aria-labelledby="chapter-title" className="min-w-0 space-y-8">
            <div className="space-y-2">
              <p className="studio-kicker studio-kicker-muted">
                Chặng {String(chapterIndex + 1).padStart(2, "0")} ·{" "}
                {CHAPTER_STATUS[chapterState(chapter, chapterUnits)]} ·{" "}
                {chapterUnits.filter((u) => u.status === "COMPLETED").length}/
                {chapterUnits.length || chapter.unitsTotal} bài
              </p>
              <h2 id="chapter-title" className="studio-head text-3xl">
                {chapter.title}
              </h2>
              <p className="studio-muted">{chapter.goal}.</p>
              {chapterState(chapter, chapterUnits) === "LOCKED" && chapter.unlockRequires && (
                <p className="studio-note text-sm">
                  <b>Điều kiện mở:</b> {chapter.unlockRequires}.
                  {chapter.unlockMissing > 0 && ` Còn thiếu ${chapter.unlockMissing} bài.`}
                </p>
              )}
            </div>

            {chapterUnits.length > 0 ? (
              <LessonList units={chapterUnits} today={r.today} />
            ) : units.isError ? (
              <ErrorBlock error={units.error} onRetry={() => units.refetch()} />
            ) : (
              <LoadingBlock rows={3} label="Đang tải các bài học…" />
            )}

            <details className="group ref-card p-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="studio-head block text-lg">Lịch học đề xuất</span>
                  <span className="block text-xs studio-muted">
                    Ngày học là gợi ý, không phải điều kiện mở khóa. Lịch tự điều chỉnh theo tiến độ
                    thật.
                  </span>
                </span>
                <span className="shrink-0 text-sm text-primary group-open:hidden">Xem lịch</span>
                <span className="hidden shrink-0 text-sm text-primary group-open:inline">
                  Thu gọn
                </span>
              </summary>
              {weeks.length === 0 ? (
                <p className="pt-3 text-sm studio-muted">
                  Lịch của chặng này sẽ có khi các chặng trước gần xong.
                </p>
              ) : (
                <div className="space-y-6 pt-4">
                  {weeks.map((w) => (
                    <Week key={w.monday} monday={w.monday} days={w.days} minutes={minutes} />
                  ))}
                </div>
              )}
            </details>
          </section>
        )}
      </div>

      <p className="text-sm">
        <Link to="/app" className="studio-link">
          Về Hôm nay
        </Link>
      </p>
    </div>
  );
}

/** A chapter's state from its lessons: done when all are completed, open when any can be studied now. */
function chapterState(c: ChapterView, units?: UnitState[]): ChapterView["status"] {
  if (!units?.length) return c.status;
  if (units.every((u) => u.status === "COMPLETED")) return "DONE";
  return units.some((u) => u.status === "AVAILABLE" || u.status === "IN_PROGRESS")
    ? "ACTIVE"
    : "LOCKED";
}

function ChapterItem({
  c,
  n,
  selected,
  onSelect,
  units,
}: {
  c: ChapterView;
  n: number;
  selected: boolean;
  onSelect: () => void;
  units?: UnitState[];
}) {
  const status = chapterState(c, units);
  const locked = status === "LOCKED";
  const done = units ? units.filter((u) => u.status === "COMPLETED").length : c.unitsDone;
  const total = units?.length ?? c.unitsTotal;
  return (
    <li className="relative pl-1">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="grid w-full grid-cols-[4.5rem_1.5rem_1fr] items-start gap-x-3 py-5 text-left"
      >
        <span
          className={`pt-0.5 text-sm font-semibold ${locked ? "studio-muted" : "text-primary"}`}
        >
          Chặng {n}
        </span>
        <span
          aria-hidden
          className={`relative z-10 mt-1 grid h-5 w-5 place-items-center rounded-full border-2 ${
            status === "DONE"
              ? "border-primary bg-primary"
              : selected
                ? "border-primary bg-sheet"
                : "border-border bg-sheet"
          }`}
        >
          {status === "DONE" ? (
            <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
          ) : (
            <span className={`h-2 w-2 rounded-full ${selected ? "bg-primary" : "bg-border"}`} />
          )}
        </span>
        <span className="min-w-0 space-y-1">
          <span className={`block text-base font-semibold ${locked ? "studio-muted" : ""}`}>
            {c.title}
          </span>
          <span className="block text-sm studio-muted">
            {done}/{total} bài · {CHAPTER_STATUS[status]}
          </span>
        </span>
      </button>
    </li>
  );
}

/** One week. A finished week folds into a row of 済 seals; open weeks list their days. */
function Week({
  monday,
  days,
  minutes,
}: {
  monday: string;
  days: CalendarDay[];
  minutes?: number;
}) {
  const sunday = new Date(`${monday}T00:00:00`);
  sunday.setDate(sunday.getDate() + 6);
  const range = `${dm(monday)} – ${sunday.getDate()}/${sunday.getMonth() + 1}`;
  const finished = days.every(
    (d) => d.status === "DONE" || d.status === "REST" || d.kind === "REST",
  );
  const hasToday = days.some((d) => d.status === "TODAY");
  return (
    <details open={!finished || hasToday} className="group ref-card p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <h3 className="studio-head text-lg">Tuần {range}</h3>
        {finished && (
          <span className="flex gap-1" aria-label="Đã hoàn thành cả tuần">
            {days
              .filter((d) => d.status === "DONE")
              .map((d) => (
                <Seal key={d.date} state="done" size={1.25} />
              ))}
          </span>
        )}
      </summary>
      <ol className="relative before:absolute before:bottom-8 before:left-[6.1rem] before:top-8 before:w-px before:bg-border">
        {days.map((d) => (
          <Day key={d.date} d={d} minutes={minutes} />
        ))}
      </ol>
    </details>
  );
}

/** One day: its date, what it teaches, how long, and its state. Test days carry the 試 seal. */
function Day({ d, minutes }: { d: CalendarDay; minutes?: number }) {
  const counts = Object.entries(d.newItems ?? {}) as [PathItemType, number][];
  const gain = counts.map(([t, n]) => `${n} ${TYPE_LABEL[t]}`).join(" · ");
  const today = d.status === "TODAY";
  const done = d.status === "DONE";
  const rest = d.kind === "REST";
  const weekly = d.checkpoint === "WEEKLY";
  const chapterGate = d.checkpoint === "CHAPTER";
  const test = weekly || chapterGate;
  const result = rest
    ? "Ngày nghỉ theo lịch."
    : weekly
      ? "Kiểm tra lại những gì đã học trong tuần, không có bài mới."
      : chapterGate
        ? "Cửa kiểm tra của chặng: đạt mới mở chặng kế tiếp."
        : d.kind === "UNIT_REVIEW" || d.kind === "REVIEW_DAY"
          ? "Ôn lại bài đã học, không có bài mới."
          : gain
            ? `Học ${gain}${d.checkpoint === "DAILY" ? " · kiểm tra cuối ngày" : ""}`
            : "Củng cố phần còn yếu.";
  const state = today
    ? "Hôm nay"
    : done
      ? "Xong"
      : d.status === "MISSED"
        ? "Bỏ lỡ"
        : rest
          ? ""
          : "Dự kiến";
  const inner = (
    <>
      <span className="text-xs studio-muted">
        <span
          className={`block text-sm ${today ? "font-semibold text-foreground" : "text-foreground"}`}
        >
          {d.dayNumber ? `Ngày ${d.dayNumber}` : "—"}
        </span>
        {weekdayVi(d.date)}
      </span>
      <span className="min-w-0">
        <span
          className={`block ${test ? "font-semibold text-seal-ink" : rest ? "studio-muted" : "font-medium"}`}
        >
          {rest ? "Nghỉ" : stripDayPrefix(d.title) || "—"}
        </span>
        <span className="block text-sm studio-muted">{result}</span>
      </span>
      <span className="flex flex-col items-end gap-1 text-xs">
        {done ? (
          <Seal state="done" size={1.6} label="Xong" />
        ) : test ? (
          <Seal state="test" size={1.6} label="Ngày kiểm tra" />
        ) : null}
        {!done && (
          <span className={today ? "font-semibold text-primary" : "studio-muted"}>
            {state}
            {minutes && !rest && !today ? ` · ≈${minutes}′` : ""}
          </span>
        )}
      </span>
    </>
  );
  const cls = `studio-rule-b grid grid-cols-[5.5rem_1fr_auto] items-start gap-4 px-2 py-3 ${
    today ? "rounded-xl bg-primary-soft/70" : ""
  }`;
  return (
    <li>
      {today ? (
        <Link to="/app" className={`studio-row ${cls}`}>
          {inner}
        </Link>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </li>
  );
}

const KIND_TAG = { LEARN: null, REVIEW: "Bài ôn", TEST: "Kiểm tra" } as const;

/**
 * The chapter's lessons with their unlock state. Completed, in-progress and available lessons open on click at any
 * time; a locked one says what to finish first. Planned dates are information only.
 */
function LessonList({ units, today }: { units: UnitState[]; today: string }) {
  return (
    <ol className="space-y-2" aria-label="Các bài học trong chặng">
      {units.map((u, i) => (
        <LessonRow key={u.id} u={u} n={i + 1} today={today} />
      ))}
    </ol>
  );
}

function LessonRow({ u, n, today }: { u: UnitState; n: number; today: string }) {
  const locked = u.status === "LOCKED";
  const done = u.status === "COMPLETED";
  const going = u.status === "IN_PROGRESS";
  const planned = u.scheduledFor
    ? u.scheduledFor >= today && !done
      ? `Học theo kế hoạch: ${dayLabelVi(u.scheduledFor, today)}`
      : `Kế hoạch: ${formatViDate(u.scheduledFor)}`
    : null;
  const meta = done
    ? [u.learnedAhead ? "Đã học trước" : null, `Nắm ${u.masteryPercent}%`, planned]
        .filter(Boolean)
        .join(" · ")
    : going
      ? [
          u.kind === "LEARN"
            ? `Đã học ${u.itemsLearned}/${u.itemsTotal}`
            : "Chưa đạt, làm lại khi sẵn sàng",
          planned,
        ]
          .filter(Boolean)
          .join(" · ")
      : locked
        ? u.lockedReason
        : [`≈${u.estimatedMinutes} phút`, planned].filter(Boolean).join(" · ");
  const action = done
    ? u.kind === "LEARN"
      ? "Xem lại"
      : "Làm lại"
    : going
      ? "Tiếp tục"
      : u.kind === "LEARN"
        ? "Bắt đầu"
        : "Làm bài";
  const marker = done ? (
    <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
  ) : going ? (
    <Play aria-hidden className="h-3.5 w-3.5" />
  ) : locked ? (
    <Lock aria-hidden className="h-3.5 w-3.5" />
  ) : (
    <span aria-hidden className="text-sm font-semibold tabular-nums">
      {n}
    </span>
  );
  const body = (
    <>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
          done
            ? "bg-primary text-primary-foreground"
            : going
              ? "border-2 border-primary bg-sheet text-primary"
              : locked
                ? "bg-muted text-muted-foreground"
                : "border-2 border-primary/50 bg-primary-soft text-primary"
        }`}
      >
        {marker}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block ${locked ? "studio-muted" : "font-semibold"}`}>
          {u.title}
          {KIND_TAG[u.kind] && (
            <span className="ml-2 text-xs font-semibold text-seal-ink">{KIND_TAG[u.kind]}</span>
          )}
        </span>
        <span className="block text-sm studio-muted">{meta}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <UnlockBadge status={u.status} />
        {!locked && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {action} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
    </>
  );
  const cls = `flex items-center gap-4 rounded-2xl border px-4 py-3 ${
    going
      ? "border-primary/40 bg-primary-soft/60"
      : locked
        ? "border-dashed border-border"
        : "border-border bg-sheet"
  }`;
  return (
    <li>
      {locked ? (
        <div className={cls} aria-disabled="true">
          {body}
        </div>
      ) : (
        <Link
          to="/app/path/study"
          search={{ phase: "UNIT", unit: u.id }}
          className={`${cls} transition-transform hover:-translate-y-0.5`}
        >
          {body}
        </Link>
      )}
    </li>
  );
}
