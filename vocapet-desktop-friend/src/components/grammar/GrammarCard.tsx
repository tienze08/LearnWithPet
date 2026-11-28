import { Link } from "@tanstack/react-router";
import { Check, Star } from "lucide-react";
import type { GrammarPoint } from "@/data/japanese/grammar";
import { LevelStamp } from "@/components/tango/shared";
import { PatternTitle } from "./PatternTitle";

/** One grammar point in the list: pattern, Vietnamese meaning, basic formation, level, link to the detail page. */
export function GrammarCard({
  g,
  learned,
  favorite,
}: {
  g: GrammarPoint;
  learned: boolean;
  favorite: boolean;
}) {
  return (
    <li>
      <Link
        to="/app/japanese/grammar/$grammarId"
        params={{ grammarId: g.id }}
        aria-label={`Xem chi tiết ngữ pháp ${g.displayPattern}`}
        className="flex h-full min-h-36 flex-col gap-2 rounded-3xl bg-card p-4 ring-1 ring-border transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="flex items-start justify-between gap-2">
          <PatternTitle pattern={g.displayPattern} className="text-2xl font-bold leading-tight" />
          <LevelStamp level={g.level} />
        </div>
        <p className="text-sm font-semibold">
          {g.meaningVi ?? (
            <span className="font-normal text-muted-foreground">Chưa có bản dịch tiếng Việt</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">Cấu trúc: {g.formationVi}</p>
        <div className="mt-auto flex items-center gap-2 pt-1 text-xs">
          <span className="font-semibold text-primary">Xem chi tiết →</span>
          {learned && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-primary">
              <Check aria-hidden className="h-3.5 w-3.5" />
              Đã học
            </span>
          )}
          {favorite && (
            <Star
              aria-label="Yêu thích"
              className={`h-3.5 w-3.5 fill-current text-warning-ink ${learned ? "" : "ml-auto"}`}
            />
          )}
        </div>
      </Link>
    </li>
  );
}
