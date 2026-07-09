import { OnboardingPayload } from "@/types/auth";
import { apiFetch } from "./client";
import type { UserResponse } from "@/types/user";
import type { PetVariant } from "@/lib/store";

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

export function updateAvatarApi(avatar: string) {
  return apiFetch<void>("/api/users/avatar", {
    method: "PATCH",
    body: JSON.stringify({
      avatar,
    }),
  });
}

export function unlockPetApi(species: PetVariant) {
  return apiFetch<{ locked: boolean }>("/api/pets/unlock", {
    method: "POST",
    body: JSON.stringify(species),
  });
}