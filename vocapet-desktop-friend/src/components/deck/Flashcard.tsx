import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Eye, EyeOff, Volume2 } from "lucide-react";

import { speak } from "./speak";
import type { Vocabulary } from "@/types/vocabulary";
import Empty from "./EmptyState";

interface FlashcardsProps {
  words: Vocabulary[];
  onAnswer: (id: number, correct: boolean) => void;
}

/** One word at a time: word, reading, meaning, example. Arrows browse; "Tiếp theo" records "nhớ" and moves on. */
export default function Flashcards({ words, onAnswer }: FlashcardsProps) {
  const [index, setIndex] = useState(0);
  const [hideReading, setHideReading] = useState(false);

  if (!words.length) return <Empty />;

  const n = words.length;
  const i = index % n;
  const w = words[i];
  const reading = w.romaji ? `(${w.romaji})` : w.kana ? `(${w.kana})` : null;
  const go = (d: number) => setIndex((p) => (p + d + n) % n);
  const arrow =
    "ref-card absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-foreground hover:bg-primary-soft";

  return (
    <div className="mx-auto max-w-[680px] space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="studio-bar flex-1"
          role="progressbar"
          aria-label="Tiến độ thẻ"
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={i + 1}
        >
          <span style={{ width: `${((i + 1) / n) * 100}%` }} />
        </div>
        <span className="text-sm font-medium tabular-nums">
          {i + 1} / {n}
        </span>
      </div>

      <div className="relative px-14">
        <button type="button" aria-label="Thẻ trước" onClick={() => go(-1)} className={`${arrow} left-0`}>
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </button>
        <article className="ref-card grid min-h-[22rem] content-center justify-items-center gap-3 rounded-3xl p-8 text-center">
          <h2 lang="ja" className="studio-jp text-6xl leading-tight sm:text-7xl">
            {w.word}
          </h2>
          {!hideReading && reading && <p className="studio-muted">{reading}</p>}
          <div className="flex items-center gap-3 text-xl font-medium">
            <button
              type="button"
              aria-label="Nghe phát âm"
              onClick={() => speak(w.word)}
              className="text-primary hover:brightness-125"
            >
              <Volume2 aria-hidden className="h-5 w-5" />
            </button>
            {w.meaning}
          </div>
          {w.example && (
            <p lang="ja" className="mt-3 w-full rounded-2xl bg-primary-soft px-5 py-4 text-base">
              {w.example}
            </p>
          )}
        </article>
        <button type="button" aria-label="Thẻ sau" onClick={() => go(1)} className={`${arrow} right-0`}>
          <ChevronRight aria-hidden className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setHideReading((v) => !v)}
          className="ref-card inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold"
        >
          {hideReading ? <Eye aria-hidden className="h-4 w-4" /> : <EyeOff aria-hidden className="h-4 w-4" />}
          {hideReading ? "Hiện cách đọc" : "Ẩn cách đọc"}
        </button>
        <button
          type="button"
          onClick={() => {
            onAnswer(w.id, false);
            go(1);
          }}
          className="ref-card inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold"
        >
          Chưa nhớ
        </button>
        <button
          type="button"
          onClick={() => {
            onAnswer(w.id, true);
            go(1);
          }}
          className="studio-btn min-h-12 px-8"
        >
          Tiếp theo
          <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
