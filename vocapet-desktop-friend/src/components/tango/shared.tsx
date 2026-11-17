import type { ReactNode } from "react";
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
  MASTERED: "bg-success/15 text-success",
  NEED_REVIEW: "bg-warning/25 text-warning-foreground dark:text-warning",
};

const LESSON_STATUS_LABEL: Record<TangoLessonStatus, string> = {
  NOT_STARTED: "Chưa học",
  IN_PROGRESS: "Đang học",
  COMPLETED: "Hoàn thành",
};

const LESSON_STATUS_CLASS: Record<TangoLessonStatus, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-info/15 text-info-foreground dark:text-info",
  COMPLETED: "bg-success/15 text-success",
};

export function WordStatusBadge({ status }: { status: TangoWordStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${WORD_STATUS_CLASS[status]}`}>
      {WORD_STATUS_LABEL[status]}
    </span>
  );
}

export function LessonStatusBadge({ status }: { status: TangoLessonStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${LESSON_STATUS_CLASS[status]}`}>
      {LESSON_STATUS_LABEL[status]}
    </span>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-card/60" />
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
    <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
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
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}
