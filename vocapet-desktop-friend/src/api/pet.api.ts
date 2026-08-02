import { apiFetch } from "./client";
import type { PetVariant } from "@/lib/store";

export function getUnlockedPetsApi() {
  return apiFetch<{ species: PetVariant; locked: boolean }[]>("/api/pets/unlocked", { method: "GET" });
}

export function selectPetApi(species: PetVariant) {
  return apiFetch<{ species: PetVariant }>("/api/pets/select", {
    method: "POST",
    body: JSON.stringify(species),
  });
}
