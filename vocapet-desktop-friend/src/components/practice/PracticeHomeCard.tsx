import { Link } from "@tanstack/react-router";
import { Languages } from "lucide-react";

import { usePracticeProgress } from "@/hooks/usePracticeProgress";
import { stageOf, statusLabel } from "@/lib/practice-progress";
import { GRAMMAR } from "@/lib/sentence-practice";

export function PracticeHomeCard() {
  const { store } = usePracticeProgress();
  const current = GRAMMAR.find((g) => {
    const p = store?.[g.id];
    return p && stageOf(g.id, p) !== "result";
  });

  return (
    <Link
      to="/app/practice"
      search={current ? { g: current.id } : {}}
      className="block rounded-[2rem] border-2 border-primary/50 bg-primary/10 p-6 card-pop transition-all hover:-translate-y-0.5 hover:border-primary"
    >
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
        <Languages className="h-4 w-4" /> Luyện câu · N5
      </p>
      <p className="mt-2 text-xl font-extrabold">
        {current
          ? `Bài ${current.lesson}: ${statusLabel(current.id, store?.[current.id])}`
          : "Ghép và đọc câu theo từng mẫu ngữ pháp"}
      </p>
      {current && <p className="mt-1 text-sm">{current.title}</p>}
      <p className="mt-3 text-sm font-bold text-primary">
        {current ? "Tiếp tục →" : "Mở danh sách mẫu →"}
      </p>
    </Link>
  );
}
