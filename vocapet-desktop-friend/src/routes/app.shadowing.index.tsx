import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic } from "lucide-react";
import { formatTime } from "@/lib/audio/engine";
import { PRIVACY } from "@/components/shadowing/Panels";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { Button } from "@/components/ui/button";
import { GRAMMAR_LEVELS, type GrammarLevel } from "@/data/japanese/grammar";
import {
  useShadowingProgressQuery,
  useShadowingUnitsQuery,
} from "@/hooks/queries/shadowing.queries";
import {
  CHECKS,
  frequency,
  GRAMMAR_TOPIC,
  MODES,
  recommend,
  sentenceKey,
  topTopics,
  type Mode,
  type Unit,
} from "@/lib/shadowing/session";

export const Route = createFileRoute("/app/shadowing/")({
  validateSearch: (search: Record<string, unknown>): { level?: GrammarLevel; mode?: Mode } => ({
    level: GRAMMAR_LEVELS.find((l) => l === search.level),
    mode:
      typeof search.mode === "string" && search.mode in MODES ? (search.mode as Mode) : undefined,
  }),
  component: ShadowingHome,
});

function ShadowingHome() {
  const search = Route.useSearch();
  const level = search.level ?? "N5";
  const mode = search.mode ?? "REPEAT";
  const navigate = Route.useNavigate();
  const units = useShadowingUnitsQuery(level);
  const progress = useShadowingProgressQuery();

  const data = progress.data;
  const all = units.data ?? [];
  const next = data && units.data ? recommend(all, data.difficulties, data.completedUnits) : null;
  const days = data
    ? frequency(
        data.sessions.map((s) => s.completedAt),
        new Date(),
      )
    : [];
  const busiest = Math.max(1, ...days.map((d) => d.count));
  const label = Object.fromEntries(CHECKS);
  const sentenceText = (unitId: string, key: string) => {
    const unit = all.find((u) => u.id === unitId);
    return unit?.lines.find((l) => sentenceKey(unit, l) === key)?.japanese ?? key;
  };
  const weak = data?.checks.filter((c) => c.missed > 0).sort((a, b) => b.missed - a.missed) ?? [];

  const row = (u: Unit) => (
    <li key={u.id} className="ref-card flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{u.title}</p>
        <p className="text-sm text-muted-foreground">
          {u.lines.length} câu{data?.completedUnits.includes(u.id) && " · đã hoàn thành"}
        </p>
      </div>
      <Button asChild className="h-11 rounded-full">
        <Link
          to="/app/shadowing/$unitId"
          params={{ unitId: u.id }}
          search={{ mode }}
          aria-label={`Luyện: ${u.title}`}
        >
          Luyện
        </Link>
      </Button>
    </li>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <h1 className="studio-head flex items-center gap-3 text-3xl">
          <Mic aria-hidden className="h-7 w-7 text-primary" /> Shadowing
        </h1>
        <p className="text-sm text-muted-foreground">
          Nghe câu tiếng Nhật rồi bắt chước thật sát. Tiến độ tính riêng, không ảnh hưởng Luyện
          nghe, từ vựng, ngữ pháp hay Learning Path.
        </p>
        <p className="text-xs text-muted-foreground">{PRIVACY}</p>
      </header>

      <div role="group" aria-label="Cấp độ JLPT" className="flex flex-wrap gap-2">
        {GRAMMAR_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            className="ref-chip !min-h-11"
            aria-pressed={level === l}
            onClick={() => navigate({ search: { level: l, mode } })}
          >
            {l}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Chế độ luyện" className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => navigate({ search: { level, mode: m } })}
            className={`rounded-2xl border p-3 text-left ${mode === m ? "border-primary bg-primary-soft" : "border-border bg-sheet hover:bg-primary-soft/60"}`}
          >
            <span className="studio-kicker">{MODES[m].level}</span>
            <span className="block font-bold">{MODES[m].title}</span>
            <span className="block text-sm text-muted-foreground">{MODES[m].about}</span>
          </button>
        ))}
      </div>

      {progress.isError && <ErrorBlock error={progress.error} onRetry={() => progress.refetch()} />}

      {next && (
        <section aria-label="Gợi ý" className="ref-card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="studio-kicker">Nên luyện tiếp</p>
            <p className="font-bold">{next.unit.title}</p>
            <p className="text-sm text-muted-foreground">{next.reason}</p>
          </div>
          <Button asChild className="h-11 rounded-full">
            <Link to="/app/shadowing/$unitId" params={{ unitId: next.unit.id }} search={{ mode }}>
              Luyện ngay
            </Link>
          </Button>
        </section>
      )}

      {units.isPending ? (
        <LoadingBlock rows={4} label="Đang tải bài shadowing" />
      ) : units.isError ? (
        <ErrorBlock error={units.error} onRetry={() => units.refetch()} />
      ) : all.length === 0 ? (
        <EmptyBlock title={`Chưa có bài shadowing ${level}`}>Hiện chỉ có nội dung N5.</EmptyBlock>
      ) : (
        <>
          <section aria-label="Hội thoại" className="space-y-2">
            <h2 className="font-bold">Hội thoại theo tình huống</h2>
            <ul className="space-y-2">{all.filter((u) => u.dialogue).map(row)}</ul>
          </section>
          <details className="space-y-2">
            <summary className="min-h-11 cursor-pointer font-bold">
              {GRAMMAR_TOPIC} ({all.filter((u) => !u.dialogue).length} mẫu)
            </summary>
            <ul className="mt-2 space-y-2">{all.filter((u) => !u.dialogue).map(row)}</ul>
          </details>
        </>
      )}

      {data && (
        <section aria-label="Tiến độ Shadowing" className="ref-card space-y-4 p-4">
          <h2 className="font-bold">Tiến độ Shadowing</h2>
          {data.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có buổi luyện nào được lưu.</p>
          ) : (
            <>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Câu đã luyện", data.sentencesPracticed],
                  ["Lần ghi âm", data.totalRecordings],
                  ["Tổng thời gian", formatTime(data.totalSeconds)],
                ].map(([name, value]) => (
                  <div key={name} className="flex flex-col-reverse">
                    <dt className="text-xs text-muted-foreground">{name}</dt>
                    <dd className="studio-head text-2xl">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <h3 className="text-sm font-semibold">Tần suất 14 ngày</h3>
                <ol className="mt-2 flex h-16 items-end gap-1">
                  {days.map((d) => (
                    <li
                      key={d.day}
                      className="flex-1 rounded-t bg-primary"
                      style={{
                        height: `${Math.max(4, (d.count / busiest) * 100)}%`,
                        opacity: d.count ? 1 : 0.15,
                      }}
                      title={`${d.day}: ${d.count} buổi`}
                    >
                      <span className="sr-only">
                        {d.day}: {d.count} buổi
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="text-sm">
                <h3 className="font-semibold">Chủ đề luyện nhiều nhất</h3>
                <ul>
                  {topTopics(all, data.sessions).map(([topic, n]) => (
                    <li key={topic}>
                      {topic}: {n} câu
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-sm">
                <h3 className="font-semibold">Điểm yếu (theo tự đánh giá)</h3>
                {weak.length ? (
                  <ul>
                    {weak.map((c) => (
                      <li key={c.check}>
                        {label[c.check].replace(/^Tôi /, "")}: chưa đạt {c.missed}/{c.assessed} lần
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Chưa ghi nhận.</p>
                )}
              </div>
              {data.difficulties.length > 0 && (
                <div className="text-sm">
                  <h3 className="font-semibold">Câu còn khó</h3>
                  <ul>
                    {data.difficulties.slice(0, 8).map((d) => (
                      <li key={d.sentenceKey}>
                        <Link
                          to="/app/shadowing/$unitId"
                          params={{ unitId: d.unitId }}
                          search={{ mode }}
                          className="flex min-h-11 flex-wrap items-center gap-2 hover:text-primary"
                        >
                          <span lang="ja">{sentenceText(d.unitId, d.sentenceKey)}</span>
                          <span className="text-muted-foreground">chưa ổn {d.timesMissed} lần</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-sm">
                <h3 className="font-semibold">Gần đây</h3>
                <ul className="divide-y divide-border">
                  {data.sessions.slice(0, 5).map((s) => (
                    <li key={s.sessionId} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>
                        {all.find((u) => u.id === s.unitId)?.title ?? s.unitId} ·{" "}
                        {MODES[s.mode].title}
                      </span>
                      <span className="text-muted-foreground">
                        {s.sentences} câu · {s.recordings} lần ghi ·{" "}
                        {new Date(s.completedAt).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
