import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ChevronLeft } from "lucide-react";
import type { NetNode } from "@/lib/japanese/kanji-map/network";

export type CircleData = {
  n: NetNode;
  onOpen: (char: string) => void;
  onToggle: (id: string) => void;
  onMore: () => void;
};
export type CircleFlowNode = Node<CircleData, "kanji">;

const TONE = { center: "green", part: "violet", usedIn: "sky", more: "neutral" } as const;

/** Kanji as a circle with its first Han Viet reading underneath. Role decides the colour; taught kanji get a ring. */
function CircleImpl({ data }: NodeProps<CircleFlowNode>) {
  const { n, onOpen, onToggle, onMore } = data;
  const isCenter = n.role === "center";
  const clickable = n.role === "more" || (n.navigable && !isCenter);
  const handleTop = n.size / 2;

  return (
    <div
      className={`km-tone-${TONE[n.role]} pointer-events-auto flex flex-col items-center gap-1`}
      style={{ width: 96 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ top: handleTop }}
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
      <div className="relative">
        <button
          type="button"
          disabled={!clickable}
          onClick={() => (n.role === "more" ? onMore() : onOpen(n.char))}
          aria-label={
            n.role === "more"
              ? `Xem thêm ${n.count} kanji`
              : isCenter
                ? `${n.char}, kanji đang xem`
                : n.navigable
                  ? `Mở bản đồ kanji ${n.char}${n.label ? `, ${n.label}` : ""}`
                  : `${n.char}, thành phần${n.label ? `, ${n.label}` : ""}`
          }
          className={[
            "grid place-items-center rounded-full transition-[transform,box-shadow] duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            clickable ? "cursor-pointer hover:scale-105" : "cursor-default",
            isCenter
              ? "shadow-[0_10px_28px_-14px_var(--km-line)] ring-4 ring-[var(--km-line)]"
              : "shadow-[0_2px_10px_-8px_oklch(0.3_0.04_150/50%)]",
            n.taught && !isCenter ? "ring-2 ring-primary" : "",
          ].join(" ")}
          style={{
            width: n.size,
            height: n.size,
            background: isCenter ? "var(--km-ink)" : "var(--km-bg)",
            color: isCenter ? "var(--card)" : "var(--km-ink)",
          }}
        >
          {n.role === "more" ? (
            <span className="text-lg font-bold">{n.char}</span>
          ) : (
            <span
              lang="ja"
              className={`jp-serif leading-none ${isCenter ? "text-5xl" : "text-3xl"}`}
            >
              {n.char}
            </span>
          )}
        </button>
        {n.role === "part" && n.count > 0 && (
          <button
            type="button"
            aria-label={
              n.collapsed
                ? `Mở ${n.count} thành phần của ${n.char}`
                : `Thu gọn thành phần của ${n.char}`
            }
            aria-expanded={!n.collapsed}
            onClick={() => onToggle(n.id)}
            className="nodrag absolute -left-3 top-1/2 z-10 grid h-6 min-w-6 -translate-y-1/2 place-items-center rounded-full bg-card px-1 text-[11px] font-bold shadow-md ring-1 ring-border transition-transform hover:scale-110"
            style={{ color: "var(--km-ink)" }}
          >
            {n.collapsed ? n.count : <ChevronLeft aria-hidden className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {n.label && (
        <span className="w-full truncate text-center text-xs text-muted-foreground" title={n.label}>
          {n.label}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{ top: handleTop }}
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
    </div>
  );
}

export const KanjiCircleNode = memo(CircleImpl);
