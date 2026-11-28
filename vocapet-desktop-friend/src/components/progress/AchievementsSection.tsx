import { useMemo } from "react";
import { useGame } from "@/lib/store";
import { useMyAchievementsQuery } from "@/hooks/queries/achievement.queries";
import { ACHIEVEMENTS, achievementStatus } from "@/lib/achievements";
import { Seal } from "@/components/learning-path/studio";

/** Achievements as a shelf of seals: the closest one up front, the full list behind a disclosure. Data rules unchanged. */
export function AchievementsSection() {
  const { state } = useGame();
  const { data: serverAchievements = [] } = useMyAchievementsQuery();

  const rows = useMemo(() => {
    const serverByCode = new Map(serverAchievements.map((item) => [item.code, item]));
    return ACHIEVEMENTS.map((a) => {
      const local = achievementStatus(a, state);
      const remote = serverByCode.get(a.id);
      return remote
        ? {
            a,
            value: Math.min(a.target, remote.progress),
            pct: Math.round((Math.min(a.target, remote.progress) / a.target) * 100),
            unlocked: remote.unlocked,
          }
        : { a, ...local };
    });
  }, [serverAchievements, state]);
  const unlocked = rows.filter((r) => r.unlocked).length;
  // The one to show first: the locked achievement nearest to done (ties: the list's own order).
  const closest = rows
    .filter((r) => !r.unlocked)
    .reduce<
      (typeof rows)[number] | null
    >((best, r) => (!best || r.pct > best.pct ? r : best), null);
  const categories = Array.from(new Set(rows.map((r) => r.a.category)));

  return (
    <section aria-labelledby="achievements" className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="achievements" className="studio-kicker studio-kicker-muted">
          Dấu mốc
        </h2>
        <span className="text-sm tabular-nums studio-muted">
          {unlocked}/{rows.length} đã đạt
        </span>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Các dấu mốc">
        {rows.map((r) => (
          <li key={r.a.id} title={r.a.title}>
            <Seal
              state={r.unlocked ? "done" : "empty"}
              size={2}
              label={`${r.a.title}: ${r.unlocked ? "đã đạt" : `${r.value}/${r.a.target}`}`}
            />
          </li>
        ))}
      </ul>
      {closest && (
        <div className="space-y-2 border-l-2 border-primary pl-4">
          <p className="text-sm">
            Gần đạt nhất: <b>{closest.a.title}</b>{" "}
            <span className="studio-muted">· {closest.a.description}</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="studio-bar flex-1" aria-hidden>
              <span style={{ width: `${closest.pct}%` }} />
            </div>
            <span className="text-xs tabular-nums studio-muted">
              {closest.value}/{closest.a.target}
            </span>
          </div>
        </div>
      )}
      <details className="group studio-rule-t">
        <summary className="flex min-h-12 cursor-pointer list-none items-center text-sm text-primary [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Xem tất cả {rows.length} dấu mốc</span>
          <span className="hidden group-open:inline">Thu gọn</span>
        </summary>
        <div className="space-y-6 pb-2">
          {categories.map((cat) => (
            <div key={cat} className="space-y-1">
              <h3 className="studio-kicker studio-kicker-muted">{cat}</h3>
              <ul className="studio-rule-t">
                {rows
                  .filter((r) => r.a.category === cat)
                  .map(({ a, value, pct, unlocked: got }) => (
                    <li
                      key={a.id}
                      className="studio-rule-b grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 px-2 py-3"
                    >
                      <Seal state={got ? "done" : "empty"} size={1.6} />
                      <span className="min-w-0">
                        <span className={`block text-sm ${got ? "font-semibold" : ""}`}>
                          {a.title}
                        </span>
                        <span className="block text-xs studio-muted">{a.description}</span>
                        {!got && (
                          <span
                            className="studio-bar mt-2 block max-w-56"
                            role="progressbar"
                            aria-label={`Tiến độ ${a.title}`}
                            aria-valuemin={0}
                            aria-valuemax={a.target}
                            aria-valuenow={value}
                          >
                            <span style={{ width: `${pct}%` }} />
                          </span>
                        )}
                      </span>
                      <span className="text-xs tabular-nums studio-muted">
                        {got ? "Đã đạt" : `${value}/${a.target}`}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
