// Translation results per sentence and direction.
// shortcut: kept in this browser only (like grammar marks) and shared by accounts on it; move to the backend when
// progress must follow the account. Only this module changes.
import { useMemo, useSyncExternalStore } from "react";

export interface PracticeRecord {
  /** Result of the latest try. */
  ok: boolean;
  tries: number;
  at: string;
  answer: string;
  /** AI explanation of that try, when it was AI-graded. */
  note?: string;
}

const KEY = "vocapet.translation.v1";
const EVENT = "vocapet-translation";

const snapshot = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

function parse(raw: string): Record<string, PracticeRecord> {
  try {
    const v = JSON.parse(raw || "null");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function recordTranslation(key: string, ok: boolean, answer: string, note?: string) {
  const all = parse(snapshot());
  all[key] = { ok, answer, note, tries: (all[key]?.tries ?? 0) + 1, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage blocked: the result just won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useTranslationRecords() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return useMemo(() => parse(raw), [raw]);
}
