import { useQuery } from "@tanstack/react-query";
import { getMyAchievementsApi } from "@/api/achievement.api";

export function useMyAchievementsQuery() {
  return useQuery({ queryKey: ["achievements", "me"], queryFn: getMyAchievementsApi });
}
