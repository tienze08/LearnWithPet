import { apiFetch } from "./client";
import type { AchievementStatusResponse } from "@/types/achievement";

export function getMyAchievementsApi() {
  return apiFetch<AchievementStatusResponse[]>("/api/achievements/me", { method: "GET" });
}
