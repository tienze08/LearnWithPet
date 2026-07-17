import { forwardRef, useImperativeHandle, useRef } from "react";

import { PetStage, PetVariant } from "@/lib/store";

import { PetAction } from "./AnimationController";
import PetCanvas, { PetCanvasHandle } from "./PixiPet";

type Props = {
  variant: PetVariant;
  stage?: PetStage;
  size?: number;
  mood?: "happy" | "excited" | "sad" | "waiting";
};

export interface PetHandle {
  play(action: PetAction): void;
}

export const PET_VARIANTS = [
  { id: "CAT", name: "Cat", desc: "A cheerful study buddy" },
  { id: "DOG", name: "Dog", desc: "A loyal companion" },
  { id: "BUNNY", name: "Bunny", desc: "A calm little helper" },
] as const;

const Pet = forwardRef<PetHandle, Props>(({ variant, stage, size = 96, mood }, ref) => {
  const canvasRef = useRef<PetCanvasHandle>(null);

  useImperativeHandle(ref, () => ({
    play(action) {
      canvasRef.current?.play(action);
    },
  }));

  return <PetCanvas ref={canvasRef} variant={variant} stage={stage ?? 1} size={size} />;
});

Pet.displayName = "Pet";

export { Pet };
export default Pet;
