import type { ReactNode } from "react";

const BUTTON =
  "min-h-12 w-full rounded-2xl border-2 px-4 py-2 text-center text-base font-extrabold";
export const PRIMARY = `${BUTTON} border-primary bg-primary text-primary-foreground disabled:opacity-40`;
export const SECONDARY = `${BUTTON} border-border bg-card hover:border-primary`;

export function Card({ children }: { children: ReactNode }) {
  return <div className="space-y-2 rounded-2xl border-2 border-border bg-card p-4">{children}</div>;
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{children}</p>;
}

export function Japanese({ ja, kana }: { ja: string; kana: string }) {
  return (
    <div lang="ja">
      <p className="text-2xl">{ja}</p>
      <p className="text-sm text-muted-foreground">{kana}</p>
    </div>
  );
}
