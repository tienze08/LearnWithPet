// Learned / favourite marks per grammar id, kept in this browser only (localStorage). When a backend exists only this module changes.
import { useMemo, useSyncExternalStore } from "react";

export type GrammarMark = "learned" | "favorite";
const KEY = "vocapet.grammar.marks.v1"; // unchanged since v1, so marks saved earlier keep working
type Store = Record<GrammarMark, string[]>;

/** Parsed stored object (any extra fields kept untouched) or {} when missing or corrupt. */
function readRaw(): Record<string, unknown> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
const ids = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const read = (): Store => {
  const raw = readRaw();
  return { learned: ids(raw.learned), favorite: ids(raw.favorite) };
};

export const getMarks = (kind: GrammarMark): Set<string> => new Set(read()[kind]);

/** Flip a mark; returns the new state. Only this kind's list changes: other fields in the stored object are preserved. */
export function toggleMark(kind: GrammarMark, id: string): boolean {
  const raw = readRaw();
  const list = ids(raw[kind]);
  const on = !list.includes(id);
  const next = {
    ...raw,
    learned: ids(raw.learned),
    favorite: ids(raw.favorite),
    [kind]: on ? [...list, id] : list.filter((x) => x !== id),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked (private mode): the mark just won't persist */
  }
  window.dispatchEvent(new Event("vocapet-grammar-marks"));
  return on;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("vocapet-grammar-marks", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("vocapet-grammar-marks", cb);
    window.removeEventListener("storage", cb);
  };
};
const snapshot = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

/** Reactive set of ids marked `kind` (empty on the server and until hydrated). */
export function useMarks(kind: GrammarMark): Set<string> {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getMarks(kind), [raw, kind]);
}
