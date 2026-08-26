import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Clock3, Flame, RotateCcw, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTodayStudyPlanQuery } from "@/hooks/queries/study-session.queries";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/app/plan")({
  component: TodayStudyPlan,
  head: () => ({
    meta: [
      { title: "Today's Study Plan | VocaPet" },
      { name: "description", content: "Your FSRS-powered daily vocabulary queue." },
    ],
  }),
});

function TodayStudyPlan() {
  const { locale, t: tr } = useTranslation();
  const { data: plan, isLoading, isError, refetch, isFetching } = useTodayStudyPlanQuery();

  if (isLoading) return <p className="py-20 text-center text-sm text-muted-foreground">{tr("plan.loading")}</p>;
  if (isError || !plan) return <p className="py-20 text-center text-sm text-destructive">{tr("plan.error")}</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{tr("plan.eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{tr("plan.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {tr("plan.description")}
        </p>
      </header>

      <section className="rounded-[2rem] border border-border bg-card/85 p-5 shadow-sm md:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<CalendarClock />} label={tr("plan.due")} value={String(plan.dueCards)} />
          <Stat icon={<Clock3 />} label={tr("plan.estimated")} value={plan.dueCards ? `~${plan.estimatedMinutes} min` : tr("home.allClear")} />
          <Stat icon={<Target />} label={tr("plan.goal")} value={`${plan.reviewsToday}/${plan.dailyGoal}`} />
          <Stat icon={<Flame />} label={tr("plan.streak")} value={`${plan.streak} d`} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {plan.suggestedDeckId ? (
            <Button asChild className="h-11 px-5">
              <Link to="/app/decks/$deckId" params={{ deckId: String(plan.suggestedDeckId) }} search={{ mode: "srs", journey: "1" }}>
                {tr("plan.start", { deck: plan.suggestedDeckName })}
              </Link>
            </Button>
          ) : (
            <Button disabled className="h-11">{tr("plan.nothingDue")}</Button>
          )}
          <Button variant="outline" className="h-11" onClick={() => refetch()} disabled={isFetching}>
            <RotateCcw className="mr-1 h-4 w-4" /> {tr("plan.refresh")}
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[2rem] border border-border bg-card/85 p-5">
          <h2 className="flex items-center gap-2 font-extrabold"><CheckCircle2 className="h-4 w-4 text-primary" /> {tr("plan.why")}</h2>
          {plan.dueReasons.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{tr("plan.empty")}</p> : (
            <ul className="mt-4 space-y-3">
              {plan.dueReasons.map((group) => (
                <li key={`${group.code}-${group.deckId}`} className="rounded-2xl border border-border/80 bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{group.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{group.deckName} · {group.detail}</p></div><span className="shrink-0 text-xs font-bold text-primary">{tr("plan.words", { count: group.count })}</span></div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">{group.words.join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[2rem] border border-border bg-card/85 p-5">
          <h2 className="font-extrabold">{tr("plan.coming")}</h2>
          {plan.upcomingCards.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{tr("plan.noScheduled")}</p> : (
            <ul className="mt-3 divide-y divide-border/70">
              {plan.upcomingCards.map((card) => <li key={card.vocabularyId} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate font-medium">{card.word}</span><span className="shrink-0 text-xs text-muted-foreground">{formatDue(card.dueAt, locale, tr)} · {card.deckName}</span></li>)}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">{tr("plan.after")}</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-background/70 px-3 py-3"><div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">{icon}{label}</div><p className="mt-1 text-xl font-extrabold">{value}</p></div>;
}

function formatDue(value: string, locale: "en" | "vi", tr: ReturnType<typeof useTranslation>["t"]) {
  const due = new Date(value);
  const minutes = Math.max(0, Math.round((due.getTime() - Date.now()) / 60000));
  if (minutes < 60) return tr("plan.inMinutes", { count: minutes });
  if (minutes < 24 * 60) return tr("plan.inHours", { count: Math.round(minutes / 60) });
  return due.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric" });
}
