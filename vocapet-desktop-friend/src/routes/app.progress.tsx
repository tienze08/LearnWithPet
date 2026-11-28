import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/lib/store";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useTangoLessonsQuery, useTangoProgressQuery } from "@/hooks/queries/tango.queries";
import { useKanaItemsQuery } from "@/hooks/queries/japanese.queries";
import {
  usePathStatusQuery,
  useReviewOverviewQuery,
  useRoadmapQuery,
  useTodayQuery,
} from "@/hooks/queries/learning-path.queries";
import { KANA_CHART, type KanaScript } from "@/lib/japanese/kana";
import { weekdayVi } from "@/lib/learning-path/dates";
import { ErrorBlock } from "@/components/tango/shared";
import { GenkoGrid, Seal, stripDayPrefix, type GenkoCell } from "@/components/learning-path/studio";
import { AchievementsSection } from "@/components/progress/AchievementsSection";
import { Cat } from "@/components/ref/Cat";
import { Award, ChevronDown, Flame, Star } from "lucide-react";

export const Route = createFileRoute("/app/progress")({
  component: ProgressPage,
});

// The Tango endpoints take a JLPT level; N5 is the only level with content today.
const TANGO_LEVEL = "N5" as const;

/** Progress: what you have learned, where you are weak, and what to improve next. Real data only. */
function ProgressPage() {
  const status = usePathStatusQuery();
  const pathOn = status.data?.enabled === true && status.data.onboarded;
  const today = useTodayQuery(pathOn);
  const t = today.data;
  const { state } = useGame();
  const { data: me } = useMeQuery();
  const streak = me?.streak ?? state.streak;

  const learned = t?.itemsUnderstood ?? 0;
  const [range, setRange] = useState(30);

  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      <header className="relative min-h-[17rem] space-y-6 sm:pr-[min(34%,20rem)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="studio-head text-4xl leading-tight sm:text-[2.75rem]">Hành trình của bạn</h1>
            <p className="max-w-[48ch] text-base studio-muted">
              {!t
                ? "Cùng nhìn lại những thành quả đã đạt được nhé!"
                : learned > 0
                  ? `Bạn đã nắm ${learned} nội dung của lộ trình ${t.profile.targetLevel}. Cùng nhìn lại những thành quả đã đạt được nhé!`
                  : `Hành trình ${t.profile.targetLevel} của bạn vừa bắt đầu. Cùng nhìn lại những thành quả đã đạt được nhé!`}
            </p>
          </div>
          <label className="ref-card relative z-10 inline-flex min-h-11 shrink-0 items-center rounded-full pl-5 pr-3 text-sm font-semibold">
            <span className="sr-only">Khoảng thời gian</span>
            <select
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
              className="cursor-pointer appearance-none bg-transparent pr-6 outline-none"
            >
              {[7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} ngày
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 h-4 w-4" />
          </label>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="ref-card grid w-40 justify-items-center gap-2 bg-peach/60 px-4 py-5 text-center">
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-sheet/80">
              <Flame className="h-6 w-6 text-streak" />
            </span>
            <p className="studio-head text-2xl leading-none tabular-nums">{streak} ngày</p>
            <p className="text-xs studio-muted">Chuỗi học tập</p>
          </div>
          <div className="ref-card grid w-40 justify-items-center gap-2 bg-butter/30 px-4 py-5 text-center">
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-sheet/80">
              <Star className="h-6 w-6 text-[var(--p-peach-ink)]" />
            </span>
            <p className="studio-head text-2xl leading-none tabular-nums">
              {me?.totalXp ?? me?.xp ?? 0} XP
            </p>
            <p className="text-xs studio-muted">Tổng điểm</p>
          </div>
        </div>
        <Cat
          pose="cheer"
          className="pointer-events-none absolute bottom-0 right-4 hidden w-[min(32%,15rem)] sm:block"
        />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="ref-card p-6">
          <Accuracy enabled={pathOn} range={range} />
        </div>
        <div className="ref-card flex flex-col items-center gap-2 p-6 text-center">
          <h2 className="studio-head w-full text-left text-lg">Cột mốc</h2>
          <span aria-hidden className="mt-2 grid h-16 w-16 place-items-center rounded-full bg-butter/40 text-[var(--p-peach-ink)]">
            <Award className="h-8 w-8" />
          </span>
          <p className="studio-head text-2xl">{t?.profile.targetLevel ?? "N5"}</p>
          <p className="text-sm studio-muted">
            {t ? `Đạt được ${t.itemsUnderstood}/${t.itemsTotal} nội dung` : "Thiết lập lộ trình để theo dõi"}
          </p>
          {t && (
            <div
              className="studio-bar w-full"
              role="progressbar"
              aria-label="Tiến độ lộ trình"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={t.progressPercent}
            >
              <span style={{ width: `${t.progressPercent}%` }} />
            </div>
          )}
        </div>
      </div>

      {pathOn && (
        <div className="ref-card p-6">
          <Consistency />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div className="ref-card p-6">
          <KanaMap />
        </div>
        <div className="ref-card min-w-0 space-y-12 p-6">
          <Vocabulary />
        </div>
      </div>

      <div className="ref-card p-6">
        <AchievementsSection />
      </div>

      <nav
        aria-label="Liên quan"
        className="studio-rule-t flex flex-wrap gap-x-6 gap-y-2 pt-5 text-sm"
      >
        <Link to="/app/tasks" className="studio-link">
          Nhiệm vụ hằng ngày
        </Link>
        <Link to="/app/pets" className="studio-link">
          Thú cưng
        </Link>
        {pathOn && (
          <Link to="/app/path/roadmap" className="studio-link">
            Hành trình
          </Link>
        )}
      </nav>
    </div>
  );
}

const DAY_STATE: Record<string, { cls: string; label: string }> = {
  DONE: { cls: "bg-primary", label: "đã học" },
  TODAY: { cls: "border-2 border-primary bg-sheet", label: "hôm nay" },
  MISSED: { cls: "bg-butter", label: "bỏ lỡ" },
  REST: { cls: "bg-surface-2", label: "nghỉ" },
  NONE: { cls: "border border-dashed border-border", label: "chưa bắt đầu" },
};

/**
 * The last four weeks of the plan's own calendar (done, missed, rest), and the lessons finished,
 * newest first. Both come from the roadmap; nothing is counted on the device.
 */
function Consistency() {
  const roadmap = useRoadmapQuery();
  if (roadmap.isPending)
    return <div className="h-24 animate-pulse rounded-[2px] bg-surface-2" aria-busy="true" />;
  if (roadmap.isError)
    return <ErrorBlock error={roadmap.error} onRetry={() => roadmap.refetch()} />;
  const days = roadmap.data.days;
  const todayIndex = days.findIndex((d) => d.status === "TODAY");
  const upTo =
    todayIndex >= 0 ? todayIndex + 1 : days.filter((d) => d.status !== "UPCOMING").length;
  const recent = days.slice(Math.max(0, upTo - 28), upTo);
  const done = days.filter((d) => d.status === "DONE");
  const missed = recent.filter((d) => d.status === "MISSED").length;
  return (
    <section className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
      <div className="space-y-3">
        <h2 className="studio-kicker studio-kicker-muted">Đều đặn · 4 tuần gần nhất</h2>
        <p className="studio-head text-2xl">
          {done.length === 0
            ? "Chưa có ngày học nào hoàn thành"
            : `${recent.filter((d) => d.status === "DONE").length} ngày học xong${missed > 0 ? `, ${missed} ngày bỏ lỡ` : ""}`}
        </p>
        <ol className="flex flex-wrap gap-1.5" aria-label="Lịch 4 tuần gần nhất">
          {recent.map((d) => {
            const st = DAY_STATE[d.status] ?? DAY_STATE.NONE;
            return (
              <li
                key={d.date}
                title={`${weekdayVi(d.date)}: ${st.label}`}
                className={`h-6 w-6 rounded-[2px] ${st.cls}`}
              >
                <span className="sr-only">
                  {weekdayVi(d.date)}: {st.label}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs studio-muted" aria-hidden>
          {(["DONE", "MISSED", "REST"] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded-[1px] ${DAY_STATE[k].cls}`} />
              {DAY_STATE[k].label}
            </span>
          ))}
        </p>
      </div>
      <div className="space-y-3">
        <h2 className="studio-kicker studio-kicker-muted">Bài đã hoàn thành · {done.length}</h2>
        {done.length === 0 ? (
          <p className="text-sm studio-muted">Ngày học đầu tiên xong sẽ hiện ở đây, kèm dấu 済.</p>
        ) : (
          <ol className="studio-rule-t">
            {[...done]
              .reverse()
              .slice(0, 5)
              .map((d) => (
                <li
                  key={d.date}
                  className="studio-rule-b grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-2 py-2.5 text-sm"
                >
                  <Seal state="done" size={1.5} />
                  <span className="min-w-0 truncate">
                    {stripDayPrefix(d.title) || `Ngày ${d.dayNumber}`}
                  </span>
                  <span className="text-xs studio-muted">{weekdayVi(d.date)}</span>
                </li>
              ))}
          </ol>
        )}
      </div>
    </section>
  );
}

const SCRIPTS: { id: KanaScript; label: string; jp: string }[] = [
  { id: "hiragana", label: "Hiragana", jp: "ひらがな" },
  { id: "katakana", label: "Katakana", jp: "カタカナ" },
];

/** The gojūon chart as a genkō grid, each cell filled by the learner's own kana progress. */
function KanaMap() {
  const [script, setScript] = useState<KanaScript>("hiragana");
  const [picked, setPicked] = useState<string | null>(null);
  const items = useKanaItemsQuery(script);
  const byKana = new Map((items.data ?? []).map((i) => [i.kana, i]));
  const cells: (GenkoCell | null)[] = KANA_CHART[script].flat().map((e) => {
    if (!e) return null;
    const p = byKana.get(e.kana);
    const seen = p ? p.correctCount + p.wrongCount > 0 : false;
    const state = p?.mastered
      ? "mastered"
      : !seen
        ? "new"
        : p!.wrongCount > p!.correctCount
          ? "weak"
          : "learning";
    return { char: e.kana, label: e.romaji, state };
  });
  const real = cells.filter((c): c is GenkoCell => c !== null);
  const mastered = real.filter((c) => c.state === "mastered").length;
  const detail = picked ? real.find((c) => c.char === picked) : null;
  const detailProgress = picked ? byKana.get(picked) : undefined;

  return (
    <section aria-labelledby="kana-map" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id="kana-map" className="studio-kicker studio-kicker-muted">
            Bản đồ chữ
          </h2>
          <p className="studio-head text-2xl">
            {items.isPending
              ? "Đang tải…"
              : `Đã thuộc ${mastered} trên ${real.length} chữ ${script === "hiragana" ? "Hiragana" : "Katakana"}`}
          </p>
        </div>
        <div role="tablist" aria-label="Bảng chữ" className="flex border border-border">
          {SCRIPTS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={script === s.id}
              onClick={() => {
                setScript(s.id);
                setPicked(null);
              }}
              className={`min-h-10 px-3 text-sm transition-colors ${
                script === s.id ? "bg-primary text-primary-foreground" : "hover:bg-primary-soft"
              }`}
            >
              <span lang="ja">{s.jp}</span>
            </button>
          ))}
        </div>
      </div>
      {items.isError ? (
        <ErrorBlock error={items.error} onRetry={() => items.refetch()} />
      ) : (
        <GenkoGrid
          cells={cells}
          cols={5}
          fontSize="clamp(1.1rem, 3.2vw, 1.6rem)"
          className="max-w-[26rem]"
          selected={picked}
          onSelect={(c) => setPicked((p) => (p === c.char ? null : c.char))}
        />
      )}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs studio-muted">
        <Legend cls="bg-primary" text="Đã thuộc" />
        <Legend cls="shadow-[inset_0_0_0_2px_var(--color-sage)]" text="Đang học" />
        <Legend cls="shadow-[inset_0_0_0_2px_var(--color-ochre)]" text="Cần ôn" />
        <Legend cls="border border-border bg-sheet" text="Chưa học" />
      </p>
      {detail && (
        <div
          className="studio-rise flex items-center gap-4 border-l-2 border-primary pl-4"
          aria-live="polite"
        >
          <span lang="ja" className="studio-jp text-4xl">
            {detail.char}
          </span>
          <span className="text-sm">
            <b>{detail.label}</b> ·{" "}
            {detailProgress
              ? `đúng ${detailProgress.correctCount} · sai ${detailProgress.wrongCount}${detailProgress.mastered ? " · đã thuộc" : ""}`
              : "chưa luyện"}
            <br />
            <Link to="/app/japanese/alphabet" className="studio-link">
              Luyện trong Bảng chữ cái
            </Link>
          </span>
        </div>
      )}
    </section>
  );
}

function Legend({ cls, text }: { cls: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={`inline-block h-3 w-3 ${cls}`} />
      {text}
    </span>
  );
}

/** Word status mix from the Tango progress endpoint, plus where to continue. */
function Vocabulary() {
  const progress = useTangoProgressQuery(TANGO_LEVEL);
  const lessons = useTangoLessonsQuery(TANGO_LEVEL);
  const w = progress.data?.words;
  const cont = progress.data?.continueLearning;
  const started = (lessons.data?.lessons ?? [])
    .filter((l) => l.status !== "NOT_STARTED")
    .slice(0, 3);
  const mix = w
    ? [
        { key: "mastered", label: "Đã thuộc", n: w.mastered, cls: "bg-primary" },
        { key: "learning", label: "Đang học", n: w.learning, cls: "bg-sage" },
        { key: "review", label: "Cần ôn", n: w.needReview, cls: "bg-butter" },
        { key: "new", label: "Chưa học", n: w.new, cls: "bg-surface-2" },
      ]
    : [];
  return (
    <section aria-labelledby="vocab" className="space-y-4">
      <h2 id="vocab" className="studio-kicker studio-kicker-muted">
        Từ vựng {TANGO_LEVEL}
      </h2>
      {progress.isError ? (
        <ErrorBlock error={progress.error} onRetry={() => progress.refetch()} />
      ) : !w ? (
        <div className="h-16 animate-pulse rounded-[2px] bg-surface-2" aria-busy="true" />
      ) : (
        <>
          <p className="studio-head text-2xl">
            {w.mastered} trên {w.total} từ đã thuộc
          </p>
          <div
            role="img"
            aria-label={mix.map((m) => `${m.label} ${m.n}`).join(", ")}
            className="flex h-2.5 overflow-hidden rounded-[2px] bg-surface-2"
          >
            {mix
              .filter((m) => m.n > 0)
              .map((m) => (
                <span key={m.key} className={m.cls} style={{ flex: m.n }} />
              ))}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {mix.map((m) => (
              <div key={m.key} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-[1px] ${m.cls} ${m.key === "new" ? "border border-border" : ""}`}
                />
                <dt className="studio-muted">{m.label}</dt>
                <dd className="ml-auto font-semibold tabular-nums">{m.n}</dd>
              </div>
            ))}
          </dl>
          {started.length > 0 && (
            <ul className="studio-rule-t">
              {started.map((l) => (
                <li key={l.id}>
                  <Link
                    to="/app/japanese/tango/lessons/$lessonId"
                    params={{ lessonId: String(l.id) }}
                    className="studio-row studio-rule-b flex min-h-11 items-center gap-3 px-2 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      Bài {l.lessonNumber} · {l.title}
                    </span>
                    <span className="tabular-nums studio-muted">{l.progressPercent}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={cont ? "/app/japanese/tango/learn/$lessonId" : "/app/japanese/tango"}
            params={cont ? { lessonId: String(cont.lessonId) } : undefined}
            className="studio-btn studio-btn-quiet"
          >
            {cont ? `Học tiếp bài ${cont.lessonNumber}` : "Chọn bài từ vựng đầu tiên"}
          </Link>
        </>
      )}
    </section>
  );
}

/** Daily accuracy over the last 14 days with answers, from the path's review history. */
function Accuracy({ enabled, range }: { enabled: boolean; range: number }) {
  const ov = useReviewOverviewQuery(enabled);
  const days = (ov.data?.history ?? []).slice(-range);
  const max = Math.max(30, Math.ceil(Math.max(0, ...days.map((d) => d.answered)) / 30) * 30);
  const total = days.reduce((s, d) => s + d.answered, 0);
  const right = days.reduce((s, d) => s + d.correct, 0);
  return (
    <section aria-labelledby="accuracy" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="accuracy" className="studio-head text-lg">
          Thống kê học tập
        </h2>
        <p className="flex gap-4 text-xs studio-muted" aria-hidden>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Câu đúng
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f1b79d]" /> Câu chưa đúng
          </span>
        </p>
      </div>
      {!enabled ? (
        <p className="text-sm studio-muted">
          Thiết lập lộ trình để theo dõi kết quả học mỗi ngày.
        </p>
      ) : ov.isPending ? (
        <div className="h-24 animate-pulse rounded-[2px] bg-surface-2" aria-busy="true" />
      ) : days.length === 0 ? (
        <p className="text-sm studio-muted">
          Chưa có lượt trả lời nào. Biểu đồ xuất hiện sau buổi học đầu tiên.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[1.75rem_1fr] gap-2" aria-hidden>
            <div className="flex h-44 flex-col justify-between text-right text-xs tabular-nums studio-muted">
              <span>{max}</span>
              <span>{max / 2}</span>
              <span>0</span>
            </div>
            <ol className="flex h-44 items-end gap-2 border-b border-border">
              {days.map((d) => (
                <li key={d.date} className="flex h-full flex-1 flex-col justify-end">
                  <span
                    className="block w-full rounded-t-full bg-[#f1b79d]"
                    style={{ height: `${((d.answered - d.correct) / max) * 100}%` }}
                  />
                  <span
                    className="block w-full bg-primary"
                    style={{ height: `${(d.correct / max) * 100}%`, borderRadius: d.answered === d.correct ? "9999px 9999px 0 0" : 0 }}
                  />
                </li>
              ))}
            </ol>
            <span />
            <ol className="flex gap-2 text-center text-xs studio-muted">
              {days.map((d) => (
                <li key={d.date} className="flex-1 truncate">
                  {range <= 7 ? weekdayVi(d.date) : d.date.slice(8, 10) + "/" + d.date.slice(5, 7)}
                </li>
              ))}
            </ol>
          </div>
          <p className="sr-only">
            {days
              .map((d) => `${weekdayVi(d.date)}: ${d.correct}/${d.answered} câu đúng`)
              .join("; ")}
          </p>
          <p className="text-sm studio-muted">
            {total} câu trong {days.length} ngày · đúng {Math.round((right / Math.max(1, total)) * 100)}%
          </p>
        </>
      )}
    </section>
  );
}
