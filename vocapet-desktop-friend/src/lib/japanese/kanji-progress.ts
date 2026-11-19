// Learning status per kanji. Nothing writes progress for kanji yet, so this returns null and the UI
// shows no status. When the backend exists (see docs/KANJI_DESIGN.md §3) only this module changes.
export type KanjiStatus = "NEW" | "LEARNING" | "MASTERED" | "NEED_REVIEW";

export const KANJI_STATUS_LABEL: Record<KanjiStatus, string> = {
  NEW: "Mới",
  LEARNING: "Đang học",
  MASTERED: "Đã thuộc",
  NEED_REVIEW: "Cần ôn",
};

export function getKanjiStatus(_char: string): KanjiStatus | null {
  return null;
}
