import type { CSSProperties, ReactNode } from "react";
import { Cat } from "@/components/ref/Cat";

/** The companion's mood for a moment in the app; the sprite plays the matching animation. Never sad or crying. */
export type PetMood = "happy" | "excited" | "sleepy" | "waiting";

/**
 * VocaPet's companion at the edge of a page: one line in a speech bubble, a mood that fits the moment.
 * `live` announces the line to screen readers (use it for feedback, not greetings).
 */
export function PetNote({
  children,
  size = 56,
  mood = "happy",
  live,
}: {
  children: ReactNode;
  size?: number;
  mood?: PetMood;
  live?: boolean;
}) {
  return (
    <div className="flex items-end gap-3 text-sm">
      <Companion size={size} mood={mood} />
      <p className="studio-bubble min-w-0" aria-live={live ? "polite" : undefined}>
        {children}
      </p>
    </div>
  );
}

/** The reference cat as a small illustration beside feedback; pose follows the mood. Pet species/unlocks live on /app/pets. */
export function Companion({ size = 40, mood = "happy" }: { size?: number; mood?: PetMood }) {
  const pose = mood === "sleepy" ? "sleep" : mood === "excited" ? "cheer" : "sit";
  return (
    <span aria-hidden className="grid shrink-0 place-items-end" style={{ width: size, height: size }}>
      <Cat pose={pose} className="max-h-full w-auto max-w-full object-contain" />
    </span>
  );
}

const JP_RUN = /[぀-ヿ㐀-鿿][぀-ヿ㐀-鿿\s・ー]*/;

/**
 * A title with its one learning phrase under the butter highlighter: the first Japanese run if there is one
 * ("năm nguyên âm あいうえお" → あいうえお), else what follows a colon. Otherwise the title stays plain.
 */
export function MarkedTitle({ text }: { text: string }) {
  const jp = text.match(JP_RUN);
  const at = jp?.index ?? (text.includes(": ") ? text.indexOf(": ") + 2 : -1);
  if (at < 0) return <>{text}</>;
  const phrase = jp ? jp[0].trimEnd() : text.slice(at);
  return (
    <>
      {text.slice(0, at)}
      <span
        className={`studio-mark ${jp ? "studio-jp whitespace-nowrap" : ""}`}
        lang={jp ? "ja" : undefined}
      >
        {phrase}
      </span>
      {text.slice(at + phrase.length)}
    </>
  );
}

export type SealState = "done" | "test" | "today" | "empty";
const SEAL_MARK: Record<SealState, string> = { done: "済", test: "試", today: "", empty: "" };

/** Hanko seal: 済 a finished day, 試 a test, an outline for today, a dashed slot otherwise. */
export function Seal({
  state,
  size = 2.25,
  stamp,
  label,
}: {
  state: SealState;
  /** rem */
  size?: number;
  /** play the stamp-down once (a day just finished) */
  stamp?: boolean;
  label?: string;
}) {
  return (
    <span
      lang="ja"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="studio-seal"
      data-state={state === "test" ? undefined : state}
      data-stamp={stamp ? "" : undefined}
      style={{ "--seal-size": `${size}rem` } as CSSProperties}
    >
      {SEAL_MARK[state]}
    </span>
  );
}

export type GenkoState = "mastered" | "learning" | "weak" | "new";
export interface GenkoCell {
  char: string;
  state: GenkoState;
  /** reading, e.g. "a" (the state is added in words) */
  label: string;
}
const GENKO_LABEL: Record<GenkoState, string> = {
  mastered: "đã thuộc",
  learning: "đang học",
  weak: "cần ôn",
  new: "chưa học",
};

/**
 * Genkō manuscript grid: one cell per character, its state as fill or outline (never colour alone: each has a label).
 * A null cell is an empty square, as in the gojūon chart. With onSelect, cells are buttons.
 */
export function GenkoGrid({
  cells,
  cols,
  fontSize = "1.25rem",
  className = "",
  selected,
  onSelect,
}: {
  cells: (GenkoCell | null)[];
  cols: number;
  fontSize?: string;
  className?: string;
  selected?: string | null;
  onSelect?: (cell: GenkoCell) => void;
}) {
  return (
    <ul
      className={`studio-genko list-none p-0 ${className}`}
      style={{ "--genko-cols": cols, fontSize } as CSSProperties}
    >
      {cells.map((c, i) =>
        c === null ? (
          <li key={`blank-${i}`} aria-hidden className="!bg-transparent before:hidden" />
        ) : (
          <li key={`${c.char}-${i}`} lang="ja" data-state={c.state} title={c.label}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(c)}
                aria-pressed={selected === c.char}
                className={`grid h-full w-full place-items-center transition-transform hover:-translate-y-px ${
                  selected === c.char ? "outline-2 outline-offset-[-4px] outline-seal" : ""
                }`}
              >
                <span aria-hidden>{c.char}</span>
                <span className="sr-only">
                  {c.char} {c.label} {GENKO_LABEL[c.state]}
                </span>
              </button>
            ) : (
              <>
                <span aria-hidden>{c.char}</span>
                <span className="sr-only">
                  {c.char} {c.label} {GENKO_LABEL[c.state]}
                </span>
              </>
            )}
          </li>
        ),
      )}
    </ul>
  );
}

/** "Ngày 6 – Hiragana: hàng T" → "Hiragana: hàng T" (the number is shown on its own). */
export const stripDayPrefix = (title: string | null | undefined) =>
  (title ?? "").replace(/^Ngày \d+\s*–\s*/, "");
