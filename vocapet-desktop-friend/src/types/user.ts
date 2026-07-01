export interface PetResponse {
  id: number;
  name: string;

  species: string;
  mood: string;

  level: number;
  xp: number;
}

export interface UserResponse {
  id: number;

  name: string;
  email: string;

  avatar: string;

  level: number;
  xp: number;
  totalXp: number;
  streak: number;

  onboarded: boolean;

  pet?: PetResponse | null;
}