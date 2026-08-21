import * as PIXI from "pixi.js";

import type { PetVariant } from "@/lib/store";
import ghostAtlas from "@/assets/ghost-9x8.webp";
import kabiAtlas from "@/assets/kabi-9x8.webp";
import blauAtlas from "@/assets/blau-9x8.webp";
import dragoniteAtlas from "@/assets/dragonite-9x8.webp";
import burumaruAtlas from "@/assets/burumaru-british-shorthair-9x8.webp";

export type PetAction =
  | "IDLE"
  | "WALK"
  | "RUN"
  | "JUMP"
  | "HAPPY"
  | "SAD"
  | "SLEEP"
  | "CELEBRATE"
  | "STUDY"
  | "WRITE"
  | "THINK"
  | "CONFUSED";

type AnimationConfig = {
  source: string;
  columns: number;
  rows?: number;
  row?: number;
  fps: number;
  frames?: number;
};

type DirectionalWalkAction = "WALK_RIGHT" | "WALK_LEFT";
type AnimationKey = PetAction | DirectionalWalkAction;

const VARIANT_ATLASES: Record<PetVariant, string> = {
  CAT: burumaruAtlas,
  FOX: ghostAtlas,
  PANDA: blauAtlas,
  BUNNY: kabiAtlas,
  DRAGON: dragoniteAtlas,
};

const PREMIUM_PET_ANIMATIONS: Record<PetAction, AnimationConfig> = {
  IDLE: { source: burumaruAtlas, columns: 8, rows: 9, row: 0, frames: 6, fps: 4 },
  WALK: { source: burumaruAtlas, columns: 8, rows: 9, row: 1, frames: 8, fps: 7 },
  RUN: { source: burumaruAtlas, columns: 8, rows: 9, row: 7, frames: 6, fps: 10 },
  JUMP: { source: burumaruAtlas, columns: 8, rows: 9, row: 4, frames: 5, fps: 7 },
  STUDY: { source: burumaruAtlas, columns: 8, rows: 9, row: 8, frames: 6, fps: 4 },
  WRITE: { source: burumaruAtlas, columns: 8, rows: 9, row: 8, frames: 6, fps: 4 },
  THINK: { source: burumaruAtlas, columns: 8, rows: 9, row: 6, frames: 6, fps: 4 },
  CONFUSED: { source: burumaruAtlas, columns: 8, rows: 9, row: 3, frames: 4, fps: 4 },
  SAD: { source: burumaruAtlas, columns: 8, rows: 9, row: 5, frames: 8, fps: 5 },
  SLEEP: { source: burumaruAtlas, columns: 8, rows: 9, row: 6, frames: 6, fps: 3 },
  HAPPY: { source: burumaruAtlas, columns: 8, rows: 9, row: 3, frames: 4, fps: 5 },
  CELEBRATE: { source: burumaruAtlas, columns: 8, rows: 9, row: 4, frames: 5, fps: 7 },
};

const PREMIUM_DIRECTIONAL_WALK: Record<DirectionalWalkAction, AnimationConfig> = {
  WALK_RIGHT: { source: burumaruAtlas, columns: 8, rows: 9, row: 1, frames: 8, fps: 7 },
  WALK_LEFT: { source: burumaruAtlas, columns: 8, rows: 9, row: 2, frames: 8, fps: 7 },
};

export default class AnimationController {
  private animations = new Map<AnimationKey, PIXI.Texture[]>();

  private currentAction: AnimationKey | null = null;

  private sprite!: PIXI.AnimatedSprite;

  private configs = new Map<AnimationKey, AnimationConfig>();

  private keyedTextures = new Map<string, PIXI.Texture>();

  private facing: "left" | "right" = "left";

  constructor(private readonly variant: PetVariant = "CAT") {}

  //----------------------------------------
  // Load tất cả animation
  //----------------------------------------

  async load() {
    const source = VARIANT_ATLASES[this.variant];
    const atlas = this.removeGreenBackground(await PIXI.Assets.load(source), source);
    const usesDirectionalWalk = true;
    const actionConfigs = PREMIUM_PET_ANIMATIONS;
    (Object.entries(actionConfigs) as [PetAction, AnimationConfig][]).forEach(([action, config]) => {
      const variantConfig = { ...config, source };
      this.configs.set(action, variantConfig);
      this.animations.set(action, this.buildFrames(atlas, variantConfig));
    });

    if (usesDirectionalWalk) {
      (Object.entries(PREMIUM_DIRECTIONAL_WALK) as [DirectionalWalkAction, AnimationConfig][]).forEach(([action, config]) => {
        const variantConfig = { ...config, source };
        this.configs.set(action, variantConfig);
        this.animations.set(action, this.buildFrames(atlas, variantConfig));
      });
    }

    this.sprite = new PIXI.AnimatedSprite(this.animations.get("IDLE")!);

    this.sprite.loop = true;

    this.sprite.animationSpeed = actionConfigs.IDLE.fps / 60;

    this.play("IDLE");
  }

  //----------------------------------------

  getSprite() {
    return this.sprite;
  }

  setFacing(direction: "left" | "right") {
    this.facing = direction;
    if (this.currentAction === "WALK_LEFT" || this.currentAction === "WALK_RIGHT") {
      this.setAnimation(direction === "left" ? "WALK_LEFT" : "WALK_RIGHT", true);
    }
  }

  //----------------------------------------

  play(action: PetAction) {
    const normalizedAction: AnimationKey = action === "WALK" && this.isDirectionalVariant()
      ? (this.facing === "left" ? "WALK_LEFT" : "WALK_RIGHT")
      : this.animations.has(action) ? action : "IDLE";

    if (normalizedAction === this.currentAction) return;

    this.setAnimation(normalizedAction, true);
  }

  private isDirectionalVariant() {
    return true;
  }

  destroy() {
    this.sprite.onComplete = undefined;
  }

  private setAnimation(action: AnimationKey, loop: boolean) {

    const frames = this.animations.get(action);

    if (!frames) return;

    this.currentAction = action;
    this.sprite.textures = frames;
    this.sprite.animationSpeed = (this.configs.get(action)?.fps ?? 6) / 60;
    this.sprite.loop = loop;
    this.sprite.onComplete = undefined;
    // Every authored row starts from its neutral transition pose. Reusing a
    // frame index from another action made walks begin mid-stride and look as
    // though the pet was sliding or walking backwards.
    this.sprite.gotoAndPlay(0);
  }

  //----------------------------------------

  private buildFrames(texture: PIXI.Texture, config: AnimationConfig) {
    // Pixi's Texture.width can be resolution-scaled. Frame rectangles however
    // are expressed in the texture source's physical pixels. Mixing the two
    // split every row at the wrong Y coordinate, showing feet from one row and
    // a head from the next one.
    const sourceWidth = texture.source.width;
    const sourceHeight = texture.source.height;
    const rows = config.rows ?? 1;
    const top = Math.round((config.row ?? 0) * sourceHeight / rows);
    const bottom = Math.round(((config.row ?? 0) + 1) * sourceHeight / rows);
    const frames: PIXI.Texture[] = [];

    const frameCount = config.frames ?? config.columns;
    for (let i = 0; i < frameCount; i++) {
      const left = Math.round(i * sourceWidth / config.columns);
      const right = Math.round((i + 1) * sourceWidth / config.columns);
      frames.push(
        new PIXI.Texture({
          source: texture.source,
          frame: new PIXI.Rectangle(
            left,
            top,
            right - left,
            bottom - top,
          ),
        }),
      );
    }

    return frames;
  }

  private removeGreenBackground(texture: PIXI.Texture, key: string) {
    const cached = this.keyedTextures.get(key);
    if (cached || typeof document === "undefined") return cached ?? texture;

    const resource = texture.source.resource as CanvasImageSource | undefined;
    if (!resource) return texture;

    const canvas = document.createElement("canvas");
    canvas.width = texture.source.width;
    canvas.height = texture.source.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return texture;

    context.drawImage(resource, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const red = pixels.data[index];
      const green = pixels.data[index + 1];
      const blue = pixels.data[index + 2];
      // The older sprites use vivid green; Dragonite's export uses vivid
      // magenta. Both are empty backdrop colours, not part of the character.
      const isGreenBackdrop = green > 150 && green > red * 1.7 && green > blue * 1.7;
      const isMagentaBackdrop = red > 150 && blue > 120 && green < red * 0.7;
      if (isGreenBackdrop || isMagentaBackdrop) {
        pixels.data[index + 3] = 0;
      }
    }
    context.putImageData(pixels, 0, 0);
    const keyed = PIXI.Texture.from(canvas);
    this.keyedTextures.set(key, keyed);
    return keyed;
  }
}
