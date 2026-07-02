// import { createFileRoute, Link } from "@tanstack/react-router";
// import { useGame } from "@/lib/store";

// import { Button } from "@/components/ui/button";
// import { Coins, Zap, CheckCircle2, BookOpen, Sparkles } from "lucide-react";
// import { toast } from "sonner";
// import { DAILY_TASKS } from "@/lib/daily-tasks";

// export const Route = createFileRoute("/app/tasks")({
//   component: TasksPage,
// });

// function TasksPage() {
//   const { state, claimTask } = useGame();

//   const tasks = DAILY_TASKS.map((t) => {
//     const progress = t.progress(state);
//     const done = progress >= t.target;
//     const claimed = state.dailyClaimedTasks.includes(t.id);
//     return { ...t, progress, done, claimed };
//   });

//   const completed = tasks.filter((t) => t.claimed).length;
//   const totalXp = tasks.reduce((sum, t) => sum + (t.claimed ? t.xp : 0), 0);
//   const possibleXp = tasks.reduce((sum, t) => sum + t.xp, 0);

//   return (
//     <div className="space-y-6">
//       <div className="rounded-3xl border-2 border-border bg-linear-to-br from-primary/15 via-accent to-secondary p-6 card-pop">
//         <div className="flex items-center gap-3">
//           <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl">
//             🎯
//           </div>
//           <div className="flex-1">
//             <p className="text-xs font-bold uppercase text-primary">Daily Quests</p>
//             <h1 className="text-2xl font-extrabold">Earn XP by completing tasks</h1>
//             <p className="text-sm text-muted-foreground">
//               XP is only awarded when you complete daily tasks. Resets every day at midnight.
//             </p>
//           </div>
//         </div>
//         <div className="mt-4 grid grid-cols-3 gap-3 text-center">
//           <Mini label="Completed" value={`${completed}/${tasks.length}`} />
//           <Mini label="XP earned" value={`${totalXp}`} sub={`of ${possibleXp}`} />
//           <Mini label="Streak" value={`${state.streak}🔥`} />
//         </div>
//       </div>

//       <div className="grid sm:grid-cols-2 gap-4">
//         {tasks.map((t) => {
//           const pct = Math.min(100, (t.progress / t.target) * 100);
//           return (
//             <div
//               key={t.id}
//               className={`rounded-2xl border-2 p-4 card-pop transition-colors ${
//                 t.claimed
//                   ? "border-success/40 bg-success/5"
//                   : t.done
//                     ? "border-primary bg-primary/5"
//                     : "border-border bg-card"
//               }`}
//             >
//               <div className="flex items-start gap-3">
//                 <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
//                   {t.icon}
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <div className="flex items-center gap-2">
//                     <h3 className="font-extrabold">{t.title}</h3>
//                     {t.claimed && <CheckCircle2 className="w-4 h-4 text-success" />}
//                   </div>
//                   <p className="text-xs text-muted-foreground">{t.description}</p>
//                   <div className="mt-2 flex items-center gap-2 text-xs font-bold">
//                     <span className="flex items-center gap-1 text-xp">
//                       <Zap className="w-3 h-3" /> +{t.xp} XP
//                     </span>
//                     <span className="flex items-center gap-1 text-coin">
//                       <Coins className="w-3 h-3" /> +{t.coins}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <div className="mt-3">
//                 <div className="flex items-center justify-between text-xs font-bold mb-1">
//                   <span className="text-muted-foreground">Progress</span>
//                   <span>
//                     {Math.min(t.progress, t.target)} / {t.target}
//                   </span>
//                 </div>
//                 <div className="h-2 bg-muted rounded-full overflow-hidden">
//                   <div
//                     className={`h-full ${t.claimed ? "bg-success" : "bg-primary"} transition-all`}
//                     style={{ width: `${pct}%` }}
//                   />
//                 </div>
//               </div>

//               <div className="mt-3">
//                 {t.claimed ? (
//                   <Button disabled variant="secondary" className="w-full">
//                     <CheckCircle2 className="w-4 h-4 mr-1" /> Claimed
//                   </Button>
//                 ) : t.done ? (
//                   <Button
//                     className="w-full btn-pop"
//                     onClick={() => {
//                       claimTask(t.id, t.xp, t.coins);
//                       toast.success(`+${t.xp} XP claimed!`, {
//                         description: `${t.title} complete 🎉`,
//                       });
//                     }}
//                   >
//                     <Sparkles className="w-4 h-4 mr-1" /> Claim reward
//                   </Button>
//                 ) : (
//                   <Button asChild variant="outline" className="w-full">
//                     <Link to="/app/decks">
//                       <BookOpen className="w-4 h-4 mr-1" /> Study to progress
//                     </Link>
//                   </Button>
//                 )}
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
//   return (
//     <div className="rounded-xl bg-background/60 border-2 border-border p-3">
//       <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
//       <p className="text-xl font-extrabold">{value}</p>
//       {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
//     </div>
//   );
// }
