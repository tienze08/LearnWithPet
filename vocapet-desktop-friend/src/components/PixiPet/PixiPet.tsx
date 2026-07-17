import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import * as PIXI from "pixi.js";

import { PetStage, PetVariant } from "@/lib/store";
import AnimationController, { PetAction } from "./AnimationController";

type Props = {
  variant: PetVariant;
  stage: PetStage;
  size: number;
};

export interface PetCanvasHandle {
  play(action: PetAction): void;
}

const PetCanvas = forwardRef<PetCanvasHandle, Props>(({ variant, stage, size }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const appRef = useRef<PIXI.Application | null>(null);

  const spriteRef = useRef<PIXI.AnimatedSprite | null>(null);

  const controllerRef = useRef<AnimationController | null>(null);

  useImperativeHandle(ref, () => ({
    play(action) {
      controllerRef.current?.play(action);
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

      const controller = new AnimationController();

      await controller.load();

      const sprite = controller.getSprite();

      sprite.anchor.set(0.5);

      sprite.x = size / 2;

      sprite.y = size / 2;

      const bounds = sprite.getLocalBounds();
      const maxDimension = Math.max(bounds.width, bounds.height);

      const scale = (size * 3.0) / maxDimension;

      sprite.scale.set(scale);

      app.stage.addChild(sprite);

      controllerRef.current = controller;

      spriteRef.current = sprite;
    }

    init();

    return () => {
      destroyed = true;

      controllerRef.current = null;

      spriteRef.current = null;

      appRef.current?.destroy(true);

      appRef.current = null;
    };
  }, [size]);

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
