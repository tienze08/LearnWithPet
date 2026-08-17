import * as PIXI from "pixi.js";

import type { PetVariant } from "@/lib/store";
import kittenAtlas from "@/assets/gray-study-kitten-6x8.png";
import foxAtlas from "@/assets/fox-study-companion-6x8.png";
import pandaAtlas from "@/assets/panda-study-companion-6x8.png";
import bunnyAtlas from "@/assets/bunny-study-companion-6x8.png";
import dragonAtlas from "@/assets/dragon-study-companion-6x8.png";
import pupuAtlas from "@/assets/pupu-golden-cat-9x8.webp";
import kittenMicroAtlas from "@/assets/gray-study-kitten-micro-5x4.png";

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

type MicroAction =
  | "BLINK"
  | "EAR_TWITCH"
  | "TAIL_WAG"
  | "HEAD_TILT"
  | "LOOK_AROUND"
  | "NOD"
  | "TURN_FLASHCARD"
  | "STRETCH"
  | "YAWN"
  | "DOZE_OFF";

type AnimationKey = PetAction | MicroAction;

type MicroClip = { action: MicroAction; delay: number };

const VARIANT_ATLASES: Record<PetVariant, string> = {
  CAT: kittenAtlas,
  FOX: foxAtlas,
  PANDA: pandaAtlas,
  BUNNY: bunnyAtlas,
  DRAGON: dragonAtlas,
  PUPU: pupuAtlas,
};

export const PET_ANIMATIONS: Record<PetAction, AnimationConfig> = {
  IDLE: { source: kittenAtlas, columns: 8, rows: 6, row: 0, fps: 4 },
  WALK: { source: kittenAtlas, columns: 8, rows: 6, row: 1, fps: 4 },
  RUN: { source: kittenAtlas, columns: 8, rows: 6, row: 1, fps: 10 },
  JUMP: { source: kittenAtlas, columns: 8, rows: 6, row: 3, fps: 7 },
  STUDY: { source: kittenAtlas, columns: 8, rows: 6, row: 2, fps: 4 },
  WRITE: { source: kittenAtlas, columns: 8, rows: 6, row: 2, fps: 5 },
  // The sheet has no separate thinking row. Idle is the correct neutral pose;
  // micro head/ear motions add expression without showing a study card.
  THINK: { source: kittenAtlas, columns: 8, rows: 6, row: 0, fps: 4 },
  CONFUSED: { source: kittenAtlas, columns: 8, rows: 6, row: 4, fps: 4 },
  SAD: { source: kittenAtlas, columns: 8, rows: 6, row: 4, fps: 4 },
  SLEEP: { source: kittenAtlas, columns: 8, rows: 6, row: 5, fps: 3 },
  HAPPY: { source: kittenAtlas, columns: 8, rows: 6, row: 3, fps: 7 },
  CELEBRATE: { source: kittenAtlas, columns: 8, rows: 6, row: 3, fps: 7 },
};

// PUPU's downloaded Petdex sheet is a fixed 8-column x 9-row atlas. Some
// rows intentionally use fewer than eight cells, so `frames` avoids pulling
// empty cells or a neighbour animation into an AnimatedSprite.
const PUPU_ANIMATIONS: Record<PetAction, AnimationConfig> = {
  IDLE: { source: pupuAtlas, columns: 8, rows: 9, row: 0, frames: 6, fps: 4 },
  WALK: { source: pupuAtlas, columns: 8, rows: 9, row: 1, frames: 8, fps: 7 },
  RUN: { source: pupuAtlas, columns: 8, rows: 9, row: 7, frames: 6, fps: 10 },
  JUMP: { source: pupuAtlas, columns: 8, rows: 9, row: 4, frames: 5, fps: 7 },
  STUDY: { source: pupuAtlas, columns: 8, rows: 9, row: 8, frames: 6, fps: 4 },
  WRITE: { source: pupuAtlas, columns: 8, rows: 9, row: 8, frames: 6, fps: 4 },
  THINK: { source: pupuAtlas, columns: 8, rows: 9, row: 6, frames: 6, fps: 4 },
  CONFUSED: { source: pupuAtlas, columns: 8, rows: 9, row: 3, frames: 4, fps: 4 },
  SAD: { source: pupuAtlas, columns: 8, rows: 9, row: 5, frames: 8, fps: 5 },
  SLEEP: { source: pupuAtlas, columns: 8, rows: 9, row: 6, frames: 6, fps: 3 },
  HAPPY: { source: pupuAtlas, columns: 8, rows: 9, row: 3, frames: 4, fps: 5 },
  CELEBRATE: { source: pupuAtlas, columns: 8, rows: 9, row: 3, frames: 4, fps: 5 },
};

const CAT_MICRO_ANIMATIONS: Record<MicroAction, AnimationConfig> = {
  BLINK: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 0, fps: 5 },
  EAR_TWITCH: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 1, fps: 5 },
  TAIL_WAG: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 2, fps: 5 },
  NOD: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 3, fps: 4 },
  TURN_FLASHCARD: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 4, fps: 4 },
  HEAD_TILT: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 0, fps: 4 },
  LOOK_AROUND: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 0, fps: 4 },
  STRETCH: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 0, fps: 4 },
  YAWN: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 0, fps: 4 },
  DOZE_OFF: { source: kittenMicroAtlas, columns: 4, rows: 5, row: 3, fps: 4 },
};

const MICRO_TIMELINES: Partial<Record<PetAction, MicroClip[]>> = {
  IDLE: [
    { action: "BLINK", delay: 5500 },
    { action: "EAR_TWITCH", delay: 8200 },
    { action: "TAIL_WAG", delay: 9200 },
  ],
  STUDY: [
    { action: "NOD", delay: 5000 },
    { action: "TURN_FLASHCARD", delay: 8500 },
    { action: "BLINK", delay: 6200 },
  ],
  THINK: [
    { action: "BLINK", delay: 4200 },
    { action: "EAR_TWITCH", delay: 7200 },
  ],
};

export default class AnimationController {
  private animations = new Map<AnimationKey, PIXI.Texture[]>();

  private currentAction: AnimationKey | null = null;

  private sprite!: PIXI.AnimatedSprite;

  private configs = new Map<AnimationKey, AnimationConfig>();

  private baseAction: PetAction = "IDLE";

  private microTimer?: number;
  private microTimelineIndex = 0;
  private keyedTextures = new Map<string, PIXI.Texture>();

  constructor(private readonly variant: PetVariant = "CAT") {}

  //----------------------------------------
  // Load tất cả animation
  //----------------------------------------

  async load() {
    const source = VARIANT_ATLASES[this.variant];
    const atlas = this.removeGreenBackground(await PIXI.Assets.load(source), source);
    const actionConfigs = this.variant === "PUPU" ? PUPU_ANIMATIONS : PET_ANIMATIONS;
    (Object.entries(actionConfigs) as [PetAction, AnimationConfig][]).forEach(([action, config]) => {
      const variantConfig = { ...config, source };
      this.configs.set(action, variantConfig);
      this.animations.set(action, this.buildFrames(atlas, variantConfig));
    });

    if (this.variant === "CAT") {
      const microAtlas = await PIXI.Assets.load(kittenMicroAtlas);
      (Object.entries(CAT_MICRO_ANIMATIONS) as [MicroAction, AnimationConfig][]).forEach(([action, config]) => {
        this.configs.set(action, config);
        this.animations.set(action, this.buildFrames(microAtlas, config));
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

  //----------------------------------------

  play(action: PetAction) {
    const normalizedAction = this.animations.has(action) ? action : "IDLE";

    if (normalizedAction === this.currentAction) return;

    this.baseAction = normalizedAction;
    this.clearMicroTimer();
    this.microTimelineIndex = 0;
    this.setAnimation(normalizedAction, true);
    this.scheduleMicroAction();
  }

  destroy() {
    this.clearMicroTimer();
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

  private scheduleMicroAction() {
    if (this.variant !== "CAT" || typeof window === "undefined") return;
    const timeline = MICRO_TIMELINES[this.baseAction];
    if (!timeline?.length) return;

    const clip = timeline[this.microTimelineIndex % timeline.length];
    this.microTimelineIndex += 1;
    this.microTimer = window.setTimeout(() => {
      this.setAnimation(clip.action, false);
      this.sprite.onComplete = () => {
        this.setAnimation(this.baseAction, true);
        this.scheduleMicroAction();
      };
    }, clip.delay);
  }

  private clearMicroTimer() {
    if (this.microTimer) window.clearTimeout(this.microTimer);
    this.microTimer = undefined;
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
      // Sprite exports use a vivid green backdrop. Key only clearly-green
      // pixels so the cat's grey fur and gold bell keep their original colour.
      if (green > 150 && green > red * 1.7 && green > blue * 1.7) {
        pixels.data[index + 3] = 0;
      }
    }
    context.putImageData(pixels, 0, 0);
    const keyed = PIXI.Texture.from(canvas);
    this.keyedTextures.set(key, keyed);
    return keyed;
  }
}
