import { forwardRef, useImperativeHandle, useRef } from "react";

import { PetStage, PetVariant } from "@/lib/store";

import { PetAction } from "./AnimationController";
import PetCanvas, { PetCanvasHandle } from "./PixiPet";

type Props = {
  variant: PetVariant;
  stage?: PetStage;
  size?: number;
  mood?: "happy" | "excited" | "sad" | "sleepy" | "waiting" | "crying";
};

export interface PetHandle {
  play(action: PetAction): void;
  setFacing(direction: "left" | "right"): void;
}

export const PET_VARIANTS = [
  { id: "CAT", name: "Cat", desc: "A cheerful study buddy" },
  { id: "FOX", name: "Fox", desc: "A clever study buddy" },
  { id: "BUNNY", name: "Bunny", desc: "A calm little helper" },
  { id: "PANDA", name: "Panda", desc: "A focused study pal" },
  { id: "DRAGON", name: "Dragon", desc: "A legendary study pal" },
] as const;

const Pet = forwardRef<PetHandle, Props>(({ variant, stage, size = 96, mood }, ref) => {
  const canvasRef = useRef<PetCanvasHandle>(null);

  useImperativeHandle(ref, () => ({
    play(action) {
      canvasRef.current?.play(action);
    },
    setFacing(direction) {
      canvasRef.current?.setFacing(direction);
    },
  }));

  return <PetCanvas ref={canvasRef} variant={variant} stage={stage ?? 1} size={size} mood={mood} />;
});

Pet.displayName = "Pet";

export { Pet };
export default Pet;
