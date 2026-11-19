import type { RubySegment } from "@/lib/japanese/kanji-map/types";

/** Japanese text with furigana. Segments flagged `hl` are highlighted (target kanji / word). */
export function Ruby({ segments, className = "" }: { segments: RubySegment[]; className?: string }) {
  return (
    <span lang="ja" className={className}>
      {segments.map((s, i) => {
        const inner = s.r ? (
          <ruby>
            {s.t}
            <rt className="text-[0.55em] font-normal text-muted-foreground">{s.r}</rt>
          </ruby>
        ) : (
          s.t
        );
        return s.hl ? (
          <mark key={i} className="rounded bg-primary-soft px-0.5 font-bold text-primary-ink">
            {inner}
          </mark>
        ) : (
          <span key={i}>{inner}</span>
        );
      })}
    </span>
  );
}
