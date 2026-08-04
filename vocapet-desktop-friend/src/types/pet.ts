export type PetMood =
  | "HAPPY"
  | "SAD"
  | "CRY"
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
