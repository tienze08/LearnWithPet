import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import {
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Repeat,
  ScrollText,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyBlock, ErrorBlock, LoadingBlock, ProgressRing } from "@/components/tango/shared";
import {
  BLOCK_ORDER,
  type BlockStatus,
  type BlockType,
  type TodayBlock,
  type TodayResponse,
} from "@/api/learning-path.api";
import {
  usePathStatusQuery,
  useSaveProfileMutation,
  useTodayQuery,
} from "@/hooks/queries/learning-path.queries";
import { formatViDate, weekdayVi } from "@/lib/learning-path/dates";

export const Route = createFileRoute("/app/path/")({ component: TodayPage });

const BLOCK: Record<
  BlockType,
  { label: string; icon: React.ReactNode; count: (n: number) => string; tag: string }
> = {
  GRAMMAR: {
    label: "Ngữ pháp",
    icon: <ScrollText className="h-5 w-5" />,
    count: (n) => `${n} mẫu mới`,
    tag: "Bài mới",
  },
  VOCAB: {
    label: "Từ vựng",
    icon: <BookOpen className="h-5 w-5" />,
    count: (n) => `${n} từ mới`,
    tag: "Học mới",
  },
  KANJI: {
    label: "Kanji",
    icon: <Sparkles className="h-5 w-5" />,
    count: (n) => `${n} chữ`,
    tag: "Học mới",
  },
  REVIEW: {
    label: "Ôn tập",
    icon: <Repeat className="h-5 w-5" />,
    count: (n) => `${n} nội dung`,
    tag: "Cần ôn",
  },
};

const STATUS_LABEL: Record<BlockStatus, string> = {
  NOT_STARTED: "Chưa làm",
  IN_PROGRESS: "Đang làm",
  DONE: "Xong",
};

function greeting() {
  const h = new Date().getHours();
  return h >= 4 && h < 11
    ? "Chào buổi sáng!"
    : h >= 11 && h < 18
      ? "Chào buổi chiều!"
      : "Chào buổi tối!";
}

function TodayPage() {
  const status = usePathStatusQuery();
  const today = useTodayQuery(status.data?.enabled === true && status.data.onboarded);

  if (status.isPending) return <LoadingBlock rows={4} />;
  if (status.isError) return <ErrorBlock error={status.error} onRetry={() => status.refetch()} />;
  if (!status.data.enabled)
    return <EmptyBlock title="Lộ trình học chưa được bật cho tài khoản này" />;
  if (!status.data.onboarded) return <Navigate to="/app/path/setup" />;
  if (today.isPending) return <LoadingBlock rows={4} />;
  if (today.isError) return <ErrorBlock error={today.error} onRetry={() => today.refetch()} />;
  return <Today t={today.data} />;
}

function Today({ t }: { t: TodayResponse }) {
  const blocks = BLOCK_ORDER.map((type) => t.blocks.find((b) => b.type === type)).filter(
    (b): b is TodayBlock => !!b && b.items.length > 0,
  );
  const next = blocks.find((b) => b.status !== "DONE");
  const started = blocks.some((b) => b.status !== "NOT_STARTED");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">{greeting()}</p>
          <h1 className="text-3xl font-bold">Hôm nay học gì nhỉ?</h1>
          <p className="text-sm text-muted-foreground">
            {t.path.title} · Ngày {Math.max(1, t.dayIndex)}/{t.totalDays}
          </p>
          <p className="text-xs text-muted-foreground">Phạm vi: {t.path.scope}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-card p-3">
          <ProgressRing
            value={t.progressPercent}
            label="Tiến độ lộ trình"
            size={60}
            text={`${t.progressPercent}%`}
          />
          <div className="text-sm">
            <p className="font-bold">Tiến độ lộ trình</p>
            <p className="text-muted-foreground">
              {t.itemsUnderstood}/{t.itemsTotal} nội dung đã hiểu
            </p>
            {t.streak > 0 && (
              <p className="mt-1 inline-flex items-center gap-1 font-semibold text-warning-ink">
                <Flame aria-hidden className="h-4 w-4" /> {t.streak} ngày liên tiếp
              </p>
            )}
          </div>
        </div>
      </header>

      {!t.feasibility.feasible && <BehindNotice t={t} />}
      {t.reducedForAccuracy && (
        <p className="rounded-2xl bg-surface-2 p-4 text-sm">
          Gần đây bạn ôn chưa chắc lắm, nên hôm nay bớt bài mới để có thêm thời gian củng cố phần
          cũ.
        </p>
      )}

      <section aria-labelledby="plan-today" className="space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <h2 id="plan-today" className="text-lg font-bold">
          Kế hoạch hôm nay
        </h2>
        {!t.studyDay && (
          <p className="text-sm text-muted-foreground">
            Hôm nay là ngày nghỉ theo lịch của bạn.{" "}
            {blocks.length ? "Ôn nhẹ một chút nếu bạn muốn." : "Nghỉ ngơi nhé!"}
          </p>
        )}
        {t.studyDay && blocks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Không còn bài mới hay bài ôn nào cho hôm nay. Bạn có thể tự khám phá các trang bên dưới.
          </p>
        )}
        <ul className="divide-y divide-border/70">
          {blocks.map((b) => (
            <li key={b.type}>
              <Link
                to="/app/path/study"
                search={{ block: b.type }}
                className="flex min-h-16 items-center gap-3 py-3 transition-colors hover:text-primary"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-ink">
                  {BLOCK[b.type].icon}
                </span>
                <span className="flex-1">
                  <span className="block font-bold">{BLOCK[b.type].label}</span>
                  <span className="block text-sm text-muted-foreground">
                    {BLOCK[b.type].count(b.items.length)} · {b.minutes} phút
                  </span>
                </span>
                <StatusChip status={b.status} tag={BLOCK[b.type].tag} />
                <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
        {blocks.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
            <p className="font-bold">Tổng: {t.totalMinutes} phút</p>
            {t.completed || !next ? (
              <p className="inline-flex items-center gap-1.5 font-bold text-primary">
                <Check aria-hidden className="h-5 w-5" /> Hoàn thành kế hoạch hôm nay
              </p>
            ) : (
              <Button size="lg" asChild>
                <Link to="/app/path/study" search={{ block: next.type }}>
                  {started ? "Học tiếp" : "Bắt đầu học hôm nay"}
                </Link>
              </Button>
            )}
          </div>
        )}
        {t.deferredReviews > 0 && (
          <p className="text-xs text-muted-foreground">
            {t.deferredReviews} nội dung ôn khác được dời sang ngày sau để hôm nay không quá tải.
          </p>
        )}
      </section>

      {t.forecast.length > 0 && (
        <section aria-labelledby="ahead" className="space-y-2 rounded-3xl bg-surface-2 p-5">
          <h2 id="ahead" className="font-bold">
            Lộ trình phía trước <span className="font-normal text-muted-foreground">(dự kiến)</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Chỉ là dự báo từ tiến độ hiện tại, sẽ thay đổi theo kết quả học thực tế.
          </p>
          <ul className="space-y-1 text-sm">
            {t.forecast.map((d) => (
              <li key={d.date} className="flex justify-between gap-3">
                <span className="capitalize">{weekdayVi(d.date)}</span>
                <span className="text-muted-foreground">
                  {[
                    d.grammar && `${d.grammar} ngữ pháp`,
                    d.vocab && `${d.vocab} từ`,
                    d.kanji && `${d.kanji} Kanji`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Ôn tập"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Dự kiến học xong nội dung mới: {formatViDate(t.feasibility.estimatedFinish)} · Hạn chót:{" "}
            {formatViDate(t.profile.targetDate)}
          </p>
        </section>
      )}

      <nav aria-label="Khám phá thêm" className="flex flex-wrap gap-2 text-sm">
        <Button variant="outline" asChild>
          <Link to="/app/japanese/grammar">Ngữ pháp</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/app/japanese/tango">Từ vựng</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/app/japanese/kanji">Kanji</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/app/path/setup">
            <Settings2 aria-hidden className="mr-1.5 h-4 w-4" /> Sửa thiết lập
          </Link>
        </Button>
      </nav>
    </div>
  );
}

function StatusChip({ status, tag }: { status: BlockStatus; tag: string }) {
  const cls =
    status === "DONE"
      ? "bg-primary text-primary-foreground"
      : status === "IN_PROGRESS"
        ? "bg-info/15 text-foreground"
        : "bg-surface-2 text-muted-foreground";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      {status === "NOT_STARTED" ? tag : STATUS_LABEL[status]}
    </span>
  );
}

/** Gentle "behind schedule" note; the learner picks the fix. */
function BehindNotice({ t }: { t: TodayResponse }) {
  const save = useSaveProfileMutation();
  const f = t.feasibility;
  const apply = (patch: Partial<TodayResponse["profile"]>) => {
    const { currentLevel, goal, minutesPerDay, daysPerWeek, targetDate, timezone } = {
      ...t.profile,
      ...patch,
    };
    save.mutate({ currentLevel, goal, minutesPerDay, daysPerWeek, targetDate, timezone });
  };
  return (
    <div className="space-y-3 rounded-2xl bg-warning/15 p-4 text-sm">
      <p>
        Theo tốc độ hiện tại, bạn sẽ học xong khoảng <b>{formatViDate(f.estimatedFinish)}</b>, sau
        hạn chót {formatViDate(t.profile.targetDate)}. Không sao cả, bạn chọn cách điều chỉnh nhé:
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={save.isPending}
          onClick={() => apply({ targetDate: f.suggestedTargetDate })}
        >
          Lùi hạn đến {formatViDate(f.suggestedTargetDate)}
        </Button>
        {f.suggestedMinutesPerDay > t.profile.minutesPerDay && f.suggestedMinutesPerDay <= 240 && (
          <Button
            size="sm"
            variant="outline"
            disabled={save.isPending}
            onClick={() => apply({ minutesPerDay: f.suggestedMinutesPerDay })}
          >
            Học {f.suggestedMinutesPerDay} phút/ngày
          </Button>
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
