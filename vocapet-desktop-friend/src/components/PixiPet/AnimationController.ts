import * as PIXI from "pixi.js";

import type { PetVariant } from "@/lib/store";
import kittenAtlas from "@/assets/gray-study-kitten-6x8.png";
import foxAtlas from "@/assets/fox-study-companion-6x8.png";
import pandaAtlas from "@/assets/panda-study-companion-6x8.png";
import bunnyAtlas from "@/assets/bunny-study-companion-6x8.png";
import dragonAtlas from "@/assets/dragon-study-companion-6x8.png";

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

const VARIANT_ATLASES: Record<PetVariant, string> = {
  CAT: kittenAtlas,
  FOX: foxAtlas,
  PANDA: pandaAtlas,
  BUNNY: bunnyAtlas,
  DRAGON: dragonAtlas,
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

const MICRO_ACTIONS: Partial<Record<PetAction, MicroAction[]>> = {
  IDLE: ["TAIL_WAG", "HEAD_TILT", "LOOK_AROUND", "STRETCH", "YAWN", "BLINK", "EAR_TWITCH"],
  STUDY: ["TURN_FLASHCARD", "NOD", "HEAD_TILT", "TAIL_WAG", "BLINK", "DOZE_OFF"],
  WALK: ["TAIL_WAG", "EAR_TWITCH", "BLINK"],
};

export default class AnimationController {
  private animations = new Map<AnimationKey, PIXI.Texture[]>();

  private currentAction: PetAction | null = null;

  private sprite!: PIXI.AnimatedSprite;

  private configs = new Map<AnimationKey, AnimationConfig>();

  private baseAction: PetAction = "IDLE";

  private microTimer?: number;
  private keyedTextures = new Map<string, PIXI.Texture>();

  constructor(private readonly variant: PetVariant = "CAT") {}

  //----------------------------------------
  // Load tất cả animation
  //----------------------------------------

  async load() {
    const source = VARIANT_ATLASES[this.variant];
    const atlas = this.removeGreenBackground(await PIXI.Assets.load(source), source);
    (Object.entries(PET_ANIMATIONS) as [PetAction, AnimationConfig][]).forEach(([action, config]) => {
      const variantConfig = { ...config, source };
      this.configs.set(action, variantConfig);
      this.animations.set(action, this.buildFrames(atlas, variantConfig));
    });

    this.sprite = new PIXI.AnimatedSprite(this.animations.get("IDLE")!);

    this.sprite.loop = true;

    this.sprite.animationSpeed = PET_ANIMATIONS.IDLE.fps / 60;

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

    this.currentAction = action as PetAction;
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
    const choices = MICRO_ACTIONS[this.baseAction];
    if (!choices || typeof window === "undefined") return;
    // Keep the companion visibly alive without interrupting the main action.
    // A shorter gap lets the user notice the subtle animation layer.
    const delay = 1800 + Math.random() * 2200;
    this.microTimer = window.setTimeout(() => {
      const micro = choices[Math.floor(Math.random() * choices.length)];
      this.playMicroMotion(micro);
      this.microTimer = window.setTimeout(() => this.scheduleMicroAction(), 850);
    }, delay);
  }

  private playMicroMotion(action: MicroAction) {
    // The generated micro sheet has non-uniform cells, so it cannot be safely
    // sliced without leaking adjacent frames. Keep micro motions procedural
    // until a padded, transparent sheet is supplied.
    const baseX = this.sprite.scale.x;
    const baseY = this.sprite.scale.y;
    const motion = {
      BLINK: { rotation: 0, x: 1, y: 0.94 },
      EAR_TWITCH: { rotation: 0.035, x: 1, y: 1 },
      TAIL_WAG: { rotation: -0.035, x: 1, y: 1 },
      HEAD_TILT: { rotation: 0.1, x: 1, y: 1 },
      LOOK_AROUND: { rotation: -0.06, x: 1.02, y: 1 },
      NOD: { rotation: 0, x: 1, y: 0.95 },
      TURN_FLASHCARD: { rotation: 0.04, x: 1.02, y: 1 },
      STRETCH: { rotation: 0, x: 1.08, y: 0.92 },
      YAWN: { rotation: -0.025, x: 1, y: 1.04 },
      DOZE_OFF: { rotation: 0.07, x: 0.98, y: 0.94 },
    }[action];

    this.sprite.rotation = motion.rotation;
    this.sprite.scale.set(baseX * motion.x, baseY * motion.y);
    window.setTimeout(() => {
      this.sprite.rotation = 0;
      this.sprite.scale.set(baseX, baseY);
    }, 700);
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

    for (let i = 0; i < config.columns; i++) {
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
