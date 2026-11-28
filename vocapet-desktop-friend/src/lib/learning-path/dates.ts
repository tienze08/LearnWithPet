// Date helpers for the Learning Path. Plan dates are plain yyyy-mm-dd in the learner's own timezone.

export const browserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";

/** yyyy-mm-dd of today + n days in the browser's local time. */
export function localDate(plusDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + plusDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const daysUntil = (iso: string) =>
  Math.round(
    (new Date(`${iso}T00:00:00`).getTime() - new Date(`${localDate()}T00:00:00`).getTime()) /
      86_400_000,
  );

export const formatViDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

export const weekdayVi = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });

/** "hôm nay", "ngày mai" or "T4, 27/11": a planned day said relative to the learner's today. */
export function dayLabelVi(iso: string, todayIso: string) {
  const diff = Math.round(
    (new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) /
      86_400_000,
  );
  return diff === 0
    ? "hôm nay"
    : diff === 1
      ? "ngày mai"
      : diff === -1
        ? "hôm qua"
        : weekdayVi(iso);
}

/** "Ngày 6 – Hiragana: hàng T" → "Hiragana: hàng T" (the number is shown on its own). */
export const stripDayPrefix = (title: string | null | undefined) =>
  (title ?? "").replace(/^Ngày \d+\s*–\s*/, "");
