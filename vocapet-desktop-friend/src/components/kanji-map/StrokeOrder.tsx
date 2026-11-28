import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Animated stroke order from KanjiVG paths (109x109 viewBox). Plays once; "Phát lại" replays. */
export function StrokeOrder({ paths, label }: { paths: string[]; label: string }) {
  const [run, setRun] = useState(0);
  return (
    <div className="space-y-3">
      <svg
        key={run}
        viewBox="0 0 109 109"
        role="img"
        aria-label={`${label}: ${paths.length} nét`}
        className="mx-auto h-44 w-44 rounded-2xl bg-card"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3.5}
      >
        <g stroke="var(--border)">
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g stroke="var(--foreground)">
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              pathLength={1}
              className="km-stroke"
              style={{ animationDelay: `${i * 0.55}s` }}
            />
          ))}
        </g>
      </svg>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{paths.length} nét</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
          <RotateCcw aria-hidden className="mr-1.5 h-4 w-4" /> Phát lại
        </Button>
      </div>
    </div>
  );
}
