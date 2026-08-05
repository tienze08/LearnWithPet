export type PetMood =
  | "HAPPY"
  | "SAD"
  | "CRYING"
  | "WAITING";

export type PetAction =
  | "IDLE"
  | "WALK"
  | "THINK"
  | "HAPPY"
  | "SAD"
  | "CRY"
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
