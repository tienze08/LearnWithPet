import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import * as PIXI from "pixi.js";

import { PetStage, PetVariant } from "@/lib/store";
import AnimationController, { PetAction } from "./AnimationController";

type Props = {
  variant: PetVariant;
  stage: PetStage;
  size: number;
  mood?: "happy" | "excited" | "sad" | "sleepy" | "waiting" | "crying";
};

export interface PetCanvasHandle {
  play(action: PetAction): void;
  setFacing(direction: "left" | "right"): void;
}

const actionForMood: Record<NonNullable<Props["mood"]>, PetAction> = {
  happy: "HAPPY",
  excited: "CELEBRATE",
  sad: "SAD",
  crying: "SAD",
  sleepy: "SLEEP",
  waiting: "IDLE",
};

const PetCanvas = forwardRef<PetCanvasHandle, Props>(({ variant, stage, size, mood }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const appRef = useRef<PIXI.Application | null>(null);

  const spriteRef = useRef<PIXI.AnimatedSprite | null>(null);

  const controllerRef = useRef<AnimationController | null>(null);

  useImperativeHandle(ref, () => ({
    play(action) {
      controllerRef.current?.play(action);
    },
    setFacing(direction) {
      const sprite = spriteRef.current;
      if (!sprite) return;
      sprite.scale.x = Math.abs(sprite.scale.x) * (direction === "right" ? 1 : -1);
    },
  }));

  useEffect(() => {
    let destroyed = false;

    async function init() {
      const app = new PIXI.Application();

      await app.init({
        width: size,
        height: size,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
      });

      if (destroyed) return;

      appRef.current = app;

      containerRef.current?.appendChild(app.canvas);

      //----------------------------------
      // Empty sprite
      //----------------------------------

      const controller = new AnimationController(variant);

      await controller.load();

      const sprite = controller.getSprite();

      sprite.anchor.set(0.5);

      sprite.x = size / 2;

      sprite.y = size / 2;

      const bounds = sprite.getLocalBounds();
      const maxDimension = Math.max(bounds.width, bounds.height);

      // Keep the full character inside the canvas. The old 3x scale was made
      // for the previous tightly-cropped sheets and cuts off this game atlas.
      const scale = (size * 0.9) / maxDimension;

      sprite.scale.set(scale);

      app.stage.addChild(sprite);

      controllerRef.current = controller;

      if (mood) controller.play(actionForMood[mood]);

      spriteRef.current = sprite;
    }

    init();

    return () => {
      destroyed = true;

      controllerRef.current?.destroy();
      controllerRef.current = null;

      spriteRef.current = null;

      appRef.current?.destroy(true);

      appRef.current = null;
    };
  }, [size, variant]);

  useEffect(() => {
    if (mood) controllerRef.current?.play(actionForMood[mood]);
  }, [mood]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        pointerEvents: "none",
        overflow: "visible",
      }}
    />
  );
});

PetCanvas.displayName = "PetCanvas";

export default PetCanvas;
