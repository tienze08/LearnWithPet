import { DeckResponse } from "@/api/deck.api";
import { ReactNode } from "react";

interface DeckHeaderProps {
  deck: DeckResponse;
  wordCount: number;
  children?: ReactNode;
}

/** A deck's title block: its mark, name, description and word count; deck actions sit to the right. */
export default function DeckHeader({ deck, wordCount, children }: DeckHeaderProps) {
  return (
    <header className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end">
      <span
        aria-hidden
        className={`grid h-16 w-16 place-items-center rounded-[var(--radius)] border border-border text-4xl ${deck.color}`}
      >
        {deck.emoji}
      </span>
      <div className="min-w-0 space-y-2">
        <p className="studio-kicker">Bộ thẻ · {wordCount} từ</p>
        <h1 className="studio-head text-4xl leading-[1.05] sm:text-5xl">{deck.name}</h1>
        {deck.description && <p className="studio-muted">{deck.description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}
