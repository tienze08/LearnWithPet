import { apiFetch } from "./client";
import type { CompanionEventType, CompanionPreferences, CompanionStateResponse } from "@/types/companion";

export function getCompanionStateApi() {
  return apiFetch<CompanionStateResponse>("/api/companion/state", { method: "GET" });
}

export function recordCompanionEventApi(event: CompanionEventType) {
  return apiFetch<CompanionStateResponse>("/api/companion/events", {
    method: "POST",
    body: JSON.stringify({ event }),
  });
}

export function updateCompanionPreferencesApi(preferences: CompanionPreferences) {
  return apiFetch<CompanionStateResponse>("/api/companion/preferences", {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });
}
