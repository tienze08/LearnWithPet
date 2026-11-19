import type { KanjiGraphData, Part } from "@/data/kanji";
import { KANJI_N5 } from "../kanji";
import { labelOf } from "./detail";

const TAUGHT = new Set(KANJI_N5.map((k) => k.char));

export type NetRole = "center" | "part" | "usedIn" | "more";

export type NetNode = {
  id: string;
  char: string;
  role: NetRole;
  x: number;
  y: number;
  size: number;
  /** Has its own entry in the graph, so it can become the centre. */
  navigable: boolean;
  /** VocaPet teaches it (Vietnamese content exists). */
  taught: boolean;
  label?: string;
  /** Number of sub-components (parts) or hidden entries (more). */
  count: number;
  collapsed: boolean;
};

export type NetEdge = { id: string; source: string; target: string };

export const COL = 190;
const ROW = 104;
export const USED_IN_VISIBLE = 6;

/**
 * Pure: components (left, from KanjiVG) -> centre kanji -> kanji that contain it (right, most frequent first).
 * Edges point from a part to the whole it belongs to.
 */
export function buildNetwork(
  center: string,
  graph: KanjiGraphData,
  collapsed: Set<string>,
  showAllUsed: boolean,
): { nodes: NetNode[]; edges: NetEdge[] } {
  const nodes: NetNode[] = [];
  const edges: NetEdge[] = [];
  const centerId = `c:${center}`;
  const taught = (c: string) => TAUGHT.has(c);

  // ---- left: parts tree, leaves take consecutive rows ----
  let row = 0;
  const left: NetNode[] = [];
  const walk = (parts: Part[], parentId: string, depth: number): number[] => {
    const ys: number[] = [];
    parts.forEach((p, i) => {
      const id = `${parentId}/${i}:${p.c}`;
      const isCollapsed = collapsed.has(id);
      const kids = isCollapsed ? [] : p.k;
      const childYs = kids.length ? walk(kids, id, depth + 1) : [];
      const y = childYs.length ? (childYs[0] + childYs[childYs.length - 1]) / 2 : row++ * ROW;
      ys.push(y);
      left.push({
        id, char: p.c, role: "part", x: -depth * COL, y, size: 72,
        navigable: !!graph.kanji[p.c], taught: taught(p.c), label: labelOf(p.c),
        count: p.k.length, collapsed: isCollapsed,
      });
      edges.push({ id: `${id}->${parentId}`, source: id, target: parentId });
    });
    return ys;
  };
  const rootYs = walk(graph.kanji[center]?.parts ?? [], centerId, 1);
  const shift = rootYs.length ? (rootYs[0] + rootYs[rootYs.length - 1]) / 2 : 0;
  left.forEach((n) => (n.y -= shift));

  // ---- centre ----
  nodes.push({
    id: centerId, char: center, role: "center", x: 0, y: 0, size: 96,
    navigable: true, taught: taught(center), label: labelOf(center), count: 0, collapsed: false,
  });
  nodes.push(...left);

  // ---- right: kanji that use it ----
  const used = graph.usedIn[center] ?? [];
  const shown = showAllUsed ? used : used.slice(0, USED_IN_VISIBLE);
  const hidden = used.length - shown.length;
  const total = shown.length + (hidden > 0 ? 1 : 0);
  shown.forEach((c, i) => {
    const id = `u:${c}`;
    nodes.push({
      id, char: c, role: "usedIn", x: COL, y: (i - (total - 1) / 2) * ROW, size: 72,
      navigable: !!graph.kanji[c], taught: taught(c), label: labelOf(c), count: 0, collapsed: false,
    });
    edges.push({ id: `${centerId}->${id}`, source: centerId, target: id });
  });
  if (hidden > 0) {
    nodes.push({
      id: "u:more", char: `+${hidden}`, role: "more", x: COL, y: (shown.length - (total - 1) / 2) * ROW, size: 72,
      navigable: false, taught: false, label: "Xem thêm", count: hidden, collapsed: true,
    });
  }
  return { nodes, edges };
}
