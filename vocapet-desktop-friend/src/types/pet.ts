export type PetMood =
  | "HAPPY"
  | "SAD"
  | "CRYING"
  | "WAITING";

export type PetAction =
  | "IDLE"
  | "WALK"
  | "HAPPY"
  | "SAD"
  | "SLEEP"
  | "CELEBRATE"
  | "STUDY";

export interface PetBehaviorResponse {
  mood: PetMood;
  action: PetAction;
  priority: number;
  duration: number;
  message: string;
}