import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Clock3, Flame, RotateCcw, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTodayStudyPlanQuery } from "@/hooks/queries/study-session.queries";

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
  const { data: plan, isLoading, isError, refetch, isFetching } = useTodayStudyPlanQuery();

  if (isLoading) return <p className="py-20 text-center text-sm text-muted-foreground">Pip is preparing your plan…</p>;
  if (isError || !plan) return <p className="py-20 text-center text-sm text-destructive">Your plan could not be loaded. Please refresh and try again.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Your focused queue</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Today&apos;s study plan</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          One shared FSRS schedule: flashcards and quizzes update the same progress, so Pip never asks you to learn the same word twice.
        </p>
      </header>

      <section className="rounded-[2rem] border border-border bg-card/85 p-5 shadow-sm md:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<CalendarClock />} label="Words due now" value={String(plan.dueCards)} />
          <Stat icon={<Clock3 />} label="Estimated time" value={plan.dueCards ? `~${plan.estimatedMinutes} min` : "All clear"} />
          <Stat icon={<Target />} label="Daily goal" value={`${plan.reviewsToday}/${plan.dailyGoal}`} />
          <Stat icon={<Flame />} label="Streak" value={`${plan.streak} d`} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {plan.suggestedDeckId ? (
            <Button asChild className="h-11 px-5">
              <Link to="/app/decks/$deckId" params={{ deckId: String(plan.suggestedDeckId) }} search={{ mode: "srs" }}>
                Start review · {plan.suggestedDeckName}
              </Link>
            </Button>
          ) : (
            <Button disabled className="h-11">Nothing due right now</Button>
          )}
          <Button variant="outline" className="h-11" onClick={() => refetch()} disabled={isFetching}>
            <RotateCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[2rem] border border-border bg-card/85 p-5">
          <h2 className="flex items-center gap-2 font-extrabold"><CheckCircle2 className="h-4 w-4 text-primary" /> Why these words are due</h2>
          {plan.dueReasons.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nothing is due. Take a break, or return when Pip calls you.</p> : (
            <ul className="mt-4 space-y-3">
              {plan.dueReasons.map((group) => (
                <li key={`${group.code}-${group.deckId}`} className="rounded-2xl border border-border/80 bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{group.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{group.deckName} · {group.detail}</p></div><span className="shrink-0 text-xs font-bold text-primary">{group.count} words</span></div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">{group.words.join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[2rem] border border-border bg-card/85 p-5">
          <h2 className="font-extrabold">Coming up next</h2>
          {plan.upcomingCards.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No scheduled cards yet.</p> : (
            <ul className="mt-3 divide-y divide-border/70">
              {plan.upcomingCards.map((card) => <li key={card.vocabularyId} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate font-medium">{card.word}</span><span className="shrink-0 text-xs text-muted-foreground">{formatDue(card.dueAt)} · {card.deckName}</span></li>)}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">After a session, you&apos;ll see accuracy, review time, streak and words marked Again.</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-background/70 px-3 py-3"><div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">{icon}{label}</div><p className="mt-1 text-xl font-extrabold">{value}</p></div>;
}

function formatDue(value: string) {
  const due = new Date(value);
  const minutes = Math.max(0, Math.round((due.getTime() - Date.now()) / 60000));
  if (minutes < 60) return `in ${minutes} min`;
  if (minutes < 24 * 60) return `in ${Math.round(minutes / 60)} h`;
  return due.toLocaleDateString([], { month: "short", day: "numeric" });
}
