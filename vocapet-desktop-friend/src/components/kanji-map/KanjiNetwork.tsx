import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type FitViewOptions,
} from "@xyflow/react";
import { Maximize2, Minus, PanelRight, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KanjiGraphData } from "@/data/kanji";
import { labelOf } from "@/lib/japanese/kanji-map/detail";
import { buildItems, searchItems } from "@/lib/japanese/kanji-map/list";
import { buildNetwork } from "@/lib/japanese/kanji-map/network";
import { KanjiCircleNode, type CircleFlowNode } from "./KanjiCircleNode";
import "./kanji-map.css";

const nodeTypes = { kanji: KanjiCircleNode };
const FIT: FitViewOptions = { padding: 0.12, maxZoom: 1.1 };
const LINE = { part: "oklch(0.74 0.09 300)", usedIn: "oklch(0.72 0.1 235)" };

function Network({
  center,
  graph,
  onOpen,
  onShowDetail,
  showDetailButton,
}: {
  center: string;
  graph: KanjiGraphData;
  onOpen: (c: string) => void;
  onShowDetail: () => void;
  showDetailButton: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showAllUsed, setShowAllUsed] = useState(false);
  const [query, setQuery] = useState("");
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const initialized = useNodesInitialized();
  const box = useRef<HTMLDivElement>(null);
  const didFit = useRef(false);

  const net = useMemo(
    () => buildNetwork(center, graph, collapsed, showAllUsed),
    [center, graph, collapsed, showAllUsed],
  );
  const toggle = useCallback(
    (id: string) =>
      setCollapsed((p) => {
        const n = new Set(p);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    [],
  );
  const more = useCallback(() => setShowAllUsed(true), []);

  const nodes: CircleFlowNode[] = useMemo(
    () =>
      net.nodes.map((n) => ({
        id: n.id,
        type: "kanji",
        position: { x: n.x - 48, y: n.y - n.size / 2 },
        width: 96,
        style: { width: 96 },
        draggable: false,
        connectable: false,
        selectable: false,
        data: { n, onOpen, onToggle: toggle, onMore: more },
      })),
    [net, onOpen, toggle, more],
  );

  const edges: Edge[] = useMemo(
    () =>
      net.edges.map((e) => {
        const color = e.source.startsWith("c:") ? LINE.usedIn : LINE.part;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "default",
          style: { stroke: color, strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
        };
      }),
    [net],
  );

  // Fit after the first layout, when nodes are measured, and whenever the shape changes.
  useEffect(() => {
    const t = setTimeout(() => fitView({ ...FIT, duration: didFit.current ? 300 : 0 }), 200);
    didFit.current = true;
    return () => clearTimeout(t);
  }, [net, initialized, fitView]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => fitView({ ...FIT, duration: 200 }), 150);
    });
    ro.observe(el);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [fitView]);

  // Search any kanji by character / Han Viet (with or without marks) / Vietnamese meaning / reading / English meaning (English is only matched, never shown).
  const items = useMemo(() => buildItems(graph), [graph]);
  const q = query.trim();
  const results = useMemo(
    () =>
      q
        ? searchItems(q, items)
            .slice(0, 8)
            .map((k) => k.char)
        : [],
    [q, items],
  );

  return (
    <div
      ref={box}
      className="km-flow relative h-full min-h-[300px] overflow-hidden rounded-3xl bg-surface-2"
    >
      <div className="absolute inset-x-0 bottom-0 top-14">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={FIT}
          minZoom={0.3}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          panOnScroll={false}
          aria-label="Mạng kanji"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.4}
            color="oklch(0.8 0.02 110)"
          />
        </ReactFlow>
      </div>

      <div className="absolute left-3 top-2 z-10 w-[min(280px,calc(100%-1.5rem))]">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Tìm kanji trong mạng"
            placeholder="Tìm chữ, Hán Việt, nghĩa, cách đọc"
            className="bg-card pl-9 shadow-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                onOpen(results[0]);
                setQuery("");
              }
            }}
          />
        </div>
        {q && (
          <ul className="mt-1 max-h-60 overflow-auto rounded-2xl bg-card p-1 shadow-lg ring-1 ring-border">
            {results.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Không có kết quả.</li>
            )}
            {results.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => {
                    onOpen(c);
                    setQuery("");
                  }}
                  className="flex min-h-11 w-full items-baseline gap-2 rounded-xl px-3 py-2 text-left hover:bg-surface-2"
                >
                  <span lang="ja" className="jp-serif text-lg">
                    {c}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{labelOf(c, true)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="absolute bottom-3 left-3 z-10 flex flex-col overflow-hidden rounded-2xl bg-card shadow-md ring-1 ring-border"
        role="group"
        aria-label="Điều khiển bản đồ"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Phóng to"
          onClick={() => zoomIn({ duration: 200 })}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Thu nhỏ"
          onClick={() => zoomOut({ duration: 200 })}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Vừa khung hình"
          onClick={() => fitView({ ...FIT, duration: 300 })}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-16 z-10 flex items-center gap-3 rounded-2xl bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-md ring-1 ring-border">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: LINE.part }} />
          Thành phần
        </span>
        <span className="flex items-center gap-1">
          <i
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: LINE.usedIn }}
          />
          Dùng trong
        </span>
      </div>

      {showDetailButton && (
        <Button
          type="button"
          size="sm"
          className="absolute right-3 top-2.5 z-10"
          onClick={onShowDetail}
        >
          <PanelRight aria-hidden className="mr-1.5 h-4 w-4" /> Chi tiết
        </Button>
      )}
    </div>
  );
}

export function KanjiNetwork(props: {
  center: string;
  graph: KanjiGraphData;
  onOpen: (c: string) => void;
  onShowDetail: () => void;
  showDetailButton: boolean;
}) {
  return (
    <ReactFlowProvider>
      <Network {...props} />
    </ReactFlowProvider>
  );
}
