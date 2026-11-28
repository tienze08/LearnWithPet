import type { TangoWordStatus } from "@/api/tango.api";

export const WORD_STATUS_LABEL: Record<TangoWordStatus, string> = {
  NEW: "Mới",
  LEARNING: "Đang học",
  MASTERED: "Đã thuộc",
  NEED_REVIEW: "Cần ôn",
};
