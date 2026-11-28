import { useState } from "react";
import { ChevronDown, Languages, List, MessageCircle, Play, Type } from "lucide-react";
import { formatTime } from "@/components/audio/AudioPlayer";
import { Button } from "@/components/ui/button";
import type { PlayerState, PlaylistPlayer, Segment } from "@/lib/audio/engine";
import type { Lesson } from "@/lib/listening/types";
import { LineText } from "./ExerciseCards";

/**
 * The dialogue, line by line, in step with the player. Japanese, translation and furigana are separate switches and
 * all start so that nothing gives an answer away. `masked` lines stay hidden while a question about their text is open.
 */
export function Transcript({
  lesson,
  segments,
  player,
  state,
  masked,
  disabled,
}: {
  lesson: Lesson;
  segments: Segment[];
  player: PlaylistPlayer;
  state: PlayerState;
  masked: number[];
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [japanese, setJapanese] = useState(false);
  const [vietnamese, setVietnamese] = useState(false);
  const [furigana, setFurigana] = useState(true);
  const active = state.status !== "idle" && state.status !== "ended";
  const starts = segments.map((_, i) =>
    segments.slice(0, i).reduce((sum, s) => sum + s.duration, 0),
  );

  const toggles = [
    { label: "Transcript", icon: List, on: japanese, set: setJapanese },
    { label: "Tiếng Việt", icon: Languages, on: vietnamese, set: setVietnamese },
    { label: "Furigana", icon: Type, on: furigana, set: setFurigana },
  ];

  return (
    <section aria-label="Hội thoại" className="ref-card min-w-0 p-4 @xl:col-span-2 @4xl:col-span-1">
      <h2>
        {/* Collapsible below three columns; always open in the third column. */}
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2 font-bold uppercase tracking-wide @4xl:pointer-events-none"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <MessageCircle aria-hidden className="h-5 w-5 text-primary" /> Hội thoại
          <ChevronDown
            aria-hidden
            className={`ml-auto h-5 w-5 transition-transform @4xl:hidden ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      <div className={`${open ? "block" : "hidden"} @4xl:block`}>
        <div role="group" aria-label="Hiển thị transcript" className="my-3 flex flex-wrap gap-1.5">
          {toggles.map(({ label, icon: Icon, on, set }) => (
            <button
              key={label}
              type="button"
              className="ref-chip !min-h-11 !px-3 gap-1.5"
              aria-pressed={on}
              onClick={() => set(!on)}
            >
              <Icon aria-hidden className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <ol className="divide-y divide-border">
          {lesson.lines.map((line, i) => {
            const current = active && state.index === i;
            const hidden = masked.includes(i);
            return (
              <li
                key={i}
                aria-current={current ? "true" : undefined}
                className={`flex items-start gap-2 rounded-xl px-1 py-2 ${current ? "bg-primary-soft" : ""}`}
              >
                <span
                  aria-hidden
                  className="mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                >
                  {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  disabled={disabled}
                  aria-label={`Phát câu ${i + 1}`}
                  onClick={() => player.play(i, i)}
                >
                  <Play className="h-4 w-4 fill-current" />
                </Button>
                <button
                  type="button"
                  className="min-h-11 min-w-0 flex-1 text-left"
                  aria-label={`Chuyển đến câu ${i + 1}, người nói ${lesson.speakers[line.speaker]}`}
                  aria-describedby={`line-${i}`}
                  onClick={() => player.seekSegment(i)}
                >
                  <span className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate font-bold text-foreground">
                      {line.speaker} · {lesson.speakers[line.speaker]}
                    </span>
                    <span className="tabular-nums">
                      {segments[i]?.src ? "" : "≈"}
                      {formatTime(starts[i] ?? 0)}
                    </span>
                  </span>
                  <span id={`line-${i}`} className="block break-words">
                    {hidden ? (
                      <span className="text-xs text-muted-foreground">
                        Ẩn cho đến khi bạn trả lời câu này
                      </span>
                    ) : japanese ? (
                      <span className="text-base leading-loose">
                        <LineText line={line} furigana={furigana} />
                      </span>
                    ) : (
                      <span
                        aria-label="Transcript đang ẩn"
                        className="mt-2 block h-0 w-3/4 border-b-4 border-dashed border-border"
                      />
                    )}
                    {vietnamese && !hidden && (
                      <span className="block text-sm text-muted-foreground">{line.meaningVi}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {lesson.draft && (
          <p className="mt-3 text-xs text-muted-foreground">
            Hội thoại và bản dịch là bản nháp, chưa được người bản ngữ duyệt.
          </p>
        )}
      </div>
    </section>
  );
}
