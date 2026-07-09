import { UserMissionResponse } from "@/types/mission";
import { apiFetch } from "./client";


export function getDailyMissionsApi() {
  return apiFetch<UserMissionResponse[]>(
    "/api/missions/daily",
    {
      method: "GET",
    },
  );
}

export function claimMissionApi(missionId: number) {
  return apiFetch<void>(
    `/api/missions/${missionId}/claim`,
    {
      method: "POST",
    },
  );
}