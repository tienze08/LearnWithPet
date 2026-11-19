import type { ReactNode } from "react";
import { AlertCircle, Check, Circle, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TangoLessonStatus, TangoWordStatus } from "@/api/tango.api";

export const WORD_STATUS_LABEL: Record<TangoWordStatus, string> = {
  NEW: "Mới",
  LEARNING: "Đang học",
  MASTERED: "Đã thuộc",
  NEED_REVIEW: "Cần ôn",
};

const WORD_STATUS_CLASS: Record<TangoWordStatus, string> = {
  NEW: "bg-muted text-muted-foreground",
  LEARNING: "bg-info/15 text-info-foreground dark:text-info",
  MASTERED: "bg-primary-soft text-primary-ink",
  NEED_REVIEW: "bg-warning/25 text-warning-ink",
};

const WORD_STATUS_ICON = {
  NEW: Circle,
  LEARNING: CircleDot,
  MASTERED: Check,
  NEED_REVIEW: AlertCircle,
} as const;

const LESSON_STATUS_LABEL: Record<TangoLessonStatus, string> = {
  NOT_STARTED: "Chưa học",
  IN_PROGRESS: "Đang học",
  COMPLETED: "Hoàn thành",
};

const LESSON_STATUS_CLASS: Record<TangoLessonStatus, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-info/15 text-info-foreground dark:text-info",
  COMPLETED: "bg-primary-soft text-primary-ink",
};

export function WordStatusBadge({ status }: { status: TangoWordStatus }) {
  const Icon = WORD_STATUS_ICON[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${WORD_STATUS_CLASS[status]}`}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {WORD_STATUS_LABEL[status]}
    </span>
  );
}

export function LessonStatusBadge({ status }: { status: TangoLessonStatus }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${LESSON_STATUS_CLASS[status]}`}>
      {LESSON_STATUS_LABEL[status]}
    </span>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />
      ))}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Đã có lỗi xảy ra";
  return (
    <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
      <p className="font-bold text-destructive">Không tải được dữ liệu</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      {onRetry && (
        <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function EmptyBlock({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-6 text-center">
      <p className="font-bold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/** Japanese text with correct `lang` and font role. */
export function JpText({
  children,
  serif,
  className = "",
  as: Tag = "span",
}: {
  children: ReactNode;
  serif?: boolean;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
}) {
  return (
    <Tag lang="ja" className={`${serif ? "jp-serif" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

/** Circular progress with a numeric label. */
export function ProgressRing({
  value,
  label,
  size = 44,
  text,
}: {
  value: number;
  label: string;
  size?: number;
  text?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const inner = size - Math.max(8, size * 0.16);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="grid shrink-0 place-items-center rounded-full transition-[background] duration-500"
      style={{ width: size, height: size, background: `conic-gradient(var(--primary) ${pct}%, var(--surface-2) 0)` }}
    >
      <span
        className="grid place-items-center rounded-full bg-card font-bold tabular-nums"
        style={{ width: inner, height: inner, fontSize: Math.max(10, size * 0.26) }}
      >
        {text ?? Math.round(pct)}
      </span>
    </div>
  );
}

/** Decorative ink circle, placed behind a hero headword. */
export function Enso({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={`pointer-events-none absolute text-primary-ink opacity-[0.07] ${className}`}>
      <path d="M58 8C28 4 6 28 10 56c4 28 32 42 56 32 22-9 28-34 18-52" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/** JLPT level mark. */
export function LevelStamp({ level }: { level: string }) {
  return (
    <span
      aria-label={`JLPT ${level}`}
      className="inline-grid h-9 min-w-9 place-items-center rounded-lg bg-seal px-2 text-sm font-bold text-white"
    >
      {level}
    </span>
  );
}
