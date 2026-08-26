import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Clock3, Flame, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useStudyAnalyticsQuery } from "@/hooks/queries/study-session.queries";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/app/analytics")({ component: Analytics });

function Analytics() {
  const { t: tr } = useTranslation();
  const [days, setDays] = useState(7);
  const { data, isLoading } = useStudyAnalyticsQuery(days);
  if (isLoading || !data) return <div className="py-16 text-center text-muted-foreground">{tr("analytics.loading")}</div>;
  const maxReviews = Math.max(1, ...data.accuracy.map((point) => point.reviewed));
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">{tr("analytics.eyebrow")}</p><h1 className="mt-2 text-3xl font-extrabold">{tr("analytics.title")}</h1></div><div className="flex rounded-xl border border-border p-1">{[7,30].map(n => <button key={n} onClick={() => setDays(n)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${days===n ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{tr("analytics.days", { count: n })}</button>)}</div></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={<TrendingUp />} label={tr("analytics.learning")} value={data.learningWords}/><Stat icon={<BarChart3 />} label={tr("analytics.learned")} value={data.learnedWords}/><Stat icon={<Flame />} label={tr("analytics.mastered")} value={data.masteredWords}/><Stat icon={<Clock3 />} label={tr("analytics.week")} value={`${data.weekMinutes} min`}/></div>
    <section className="rounded-3xl border border-border bg-card/80 p-6 card-pop"><h2 className="font-extrabold">{tr("analytics.accuracy")}</h2><div className="mt-5 overflow-x-auto pb-1"><div className="grid h-44 min-w-[620px] gap-2" style={{ gridTemplateColumns: `repeat(${data.accuracy.length}, minmax(0, 1fr))` }}>{data.accuracy.map(p => { const accuracy=p.reviewed?Math.round(p.correct/p.reviewed*100):0; const volume=p.reviewed?Math.max(14, Math.round(p.reviewed/maxReviews*100)):4; return <div key={p.date} className="flex min-w-0 flex-col justify-end"><span className="mb-1 text-center text-[10px] font-bold tabular-nums">{p.reviewed ? `${accuracy}%` : "—"}</span><div className="flex flex-1 items-end overflow-hidden rounded-t-lg bg-muted/50"><div className="w-full rounded-t-lg bg-linear-to-t from-primary to-emerald-400 transition-[height] duration-500" style={{height:`${volume}%`}} /></div><span className="mt-2 text-center text-[10px] text-muted-foreground">{p.date.slice(5)}</span></div>})}</div></div><p className="mt-3 text-xs text-muted-foreground">{tr("analytics.accuracyDetail")}</p></section>
    <section className="rounded-3xl border border-border bg-card/80 p-6 card-pop"><h2 className="font-extrabold">{tr("analytics.deckStrength")}</h2><div className="mt-4 space-y-3">{data.decks.length ? data.decks.map(deck => { const pct=deck.reviewed?Math.round(deck.correct/deck.reviewed*100):0; return <div key={deck.deckId}><div className="flex justify-between text-sm"><span className="font-bold">{deck.deckName}</span><span className="text-muted-foreground">{pct}% · {tr("analytics.reviews", { count: deck.reviewed })}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{width:`${pct}%`}}/></div></div> }) : <p className="text-sm text-muted-foreground">{tr("analytics.noDeck")}</p>}</div></section>
    <section className="rounded-3xl border border-border bg-card/80 p-6 card-pop"><h2 className="font-extrabold">{tr("analytics.calendar")}</h2><div className="mt-4 grid w-fit grid-cols-7 gap-2">{data.accuracy.map(p => <div key={p.date} title={p.date} aria-label={p.date} className={`h-9 w-9 rounded-lg transition-colors sm:h-10 sm:w-10 ${data.activeDays.includes(p.date) ? "bg-primary shadow-sm" : "bg-muted"}`} />)}</div><p className="mt-3 text-xs text-muted-foreground">{tr("analytics.calendarDetail")}</p></section>
  </div>;
}
function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string|number}) { return <div className="rounded-2xl border border-border bg-card/80 p-5"><div className="flex gap-2 text-xs font-bold uppercase text-muted-foreground">{icon}{label}</div><p className="mt-2 text-3xl font-extrabold">{value}</p></div>; }
