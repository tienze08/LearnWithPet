import { OnboardingPayload } from "@/types/auth";
import { apiFetch } from "./client";
import type { UserResponse } from "@/types/user";

export function getMeApi() {
  return apiFetch<UserResponse>(
    "/api/users/me",
    {
      method: "GET",
    },
  );
}

export function onboardingApi(
  payload: OnboardingPayload,
) {
  return apiFetch<void>(
    "/api/users/onboarding",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}