import { create } from "zustand";

export type CompanionActivity = "AMBIENT" | "READING";

type CompanionActivityStore = {
  activity: CompanionActivity;
  setReading: () => void;
  clear: () => void;
};

let expiryTimer: number | undefined;

export const useCompanionActivity = create<CompanionActivityStore>((set) => ({
  activity: "AMBIENT",
  setReading() {
    if (expiryTimer) window.clearTimeout(expiryTimer);
    set({ activity: "READING" });
    expiryTimer = window.setTimeout(() => set({ activity: "AMBIENT" }), 75_000);
  },
  clear() {
    if (expiryTimer) window.clearTimeout(expiryTimer);
    expiryTimer = undefined;
    set({ activity: "AMBIENT" });
  },
}));

/** Mark a real reading interaction; it expires after the learner goes idle. */
export function markCompanionReading() {
  useCompanionActivity.getState().setReading();
}
