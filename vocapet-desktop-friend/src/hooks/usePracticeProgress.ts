import { useState } from "react";

import { useMeQuery } from "@/hooks/queries/user.queries";
import { parseStore, type Progress, type Store } from "@/lib/practice-progress";

// Giữ trong bộ nhớ để vẫn dùng được khi trình duyệt chặn localStorage.
const memory = new Map<string, Store>();

function read(key: string): Store {
  let store = memory.get(key);
  if (!store) {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
    store = parseStore(raw);
    memory.set(key, store);
  }
  return store;
}

/** Tiến độ lưu theo từng tài khoản trên trình duyệt này, chưa đồng bộ lên server. */
export function usePracticeProgress() {
  const { data: me } = useMeQuery();
  const [, setVersion] = useState(0);
  const key = me ? `vocapet.practice.v1.${me.id}` : null;

  const save = (grammarId: string, progress: Progress) => {
    if (!key) return;
    const next = { ...read(key), [grammarId]: progress };
    memory.set(key, next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Chỉ giữ trong bộ nhớ.
    }
    setVersion((v) => v + 1);
  };

  return { store: key ? read(key) : null, save };
}
