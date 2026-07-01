import type { PetVariant } from "@/lib/store";

function mapPetSpecies(species: string): PetVariant {
  return species.toUpperCase() as PetVariant;
}