import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { PetMood, PetStage, PetVariant } from "@/lib/store";
import catidl from "@/assets/cat_idl.png";

type Props = {
  variant: PetVariant;
  mood: PetMood;
  stage: PetStage;
  size?: number;
};

interface CustomApplication extends PIXI.Application {
  handleResizeEvent?: () => void;
}

export default function PetCanvas({ variant, mood, stage, size = 240 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let app: CustomApplication | null = null;
    let isDestroyed = false;

    async function init() {
      app = new PIXI.Application() as CustomApplication;

      await app.init({
        width: size,
        height: size,
        backgroundAlpha: 0,
        antialias: true,
        roundPixels: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: false,
      });

      if (isDestroyed) {
        if (app) {
          app.destroy(true); // ✅ FIX: Safe standard parameter for Pixi v8 Application
        }
        return;
      }

      if (containerRef.current && app?.canvas) {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(app.canvas);
      }

      const texture = await PIXI.Assets.load(catidl);
      if (isDestroyed) return;

      const FRAME_COUNT = 8;
      const FRAME_W = texture.width / FRAME_COUNT;
      const FRAME_H = texture.height;
      const frames: PIXI.Texture[] = [];

      for (let i = 0; i < FRAME_COUNT; i++) {
        const rect = new PIXI.Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H);
        frames.push(
          new PIXI.Texture({
            source: texture.source,
            frame: rect,
          }),
        );
      }

      const cat = new PIXI.AnimatedSprite(frames);

      const scale = (size / FRAME_H) * 0.9;
      cat.scale.set(scale);

      cat.anchor.set(0.5, 1);
      cat.x = size / 2;
      cat.y = size;

      cat.animationSpeed = 0.1;
      cat.loop = true;
      cat.play();

      if (app.stage) {
        app.stage.addChild(cat);
      }

      const handleResize = () => {
        if (app?.renderer) {
          app.renderer.resize(size, size);
        }
      };

      window.addEventListener("resize", handleResize);
      app.handleResizeEvent = handleResize;
    }

    init();

    return () => {
      isDestroyed = true;
      if (app) {
        if (app.handleResizeEvent) {
          window.removeEventListener("resize", app.handleResizeEvent);
        }
        try {
          if (containerRef.current) {
            containerRef.current.innerHTML = "";
          }
          app.destroy(true); // ✅ FIX: Clears internal WebGL/WebGPU structures natively
        } catch (e) {
          console.warn("PixiJS cleanup early:", e);
        }
      }
    };
  }, [size, variant, mood, stage]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        pointerEvents: "none",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        overflow: "visible",
      }}
    />
  );
}
