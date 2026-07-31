import * as PIXI from "pixi.js";

import kittenAtlas from "@/assets/gray-study-kitten-6x8.png";
import microAtlas from "@/assets/gray-study-kitten-micro-10x4-packed.png";

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

export const PET_ANIMATIONS: Record<PetAction, AnimationConfig> = {
  IDLE: { source: kittenAtlas, columns: 8, rows: 6, row: 0, fps: 4 },
  WALK: { source: kittenAtlas, columns: 8, rows: 6, row: 1, fps: 4 },
  RUN: { source: kittenAtlas, columns: 8, rows: 6, row: 1, fps: 10 },
  JUMP: { source: kittenAtlas, columns: 8, rows: 6, row: 3, fps: 7 },
  STUDY: { source: kittenAtlas, columns: 8, rows: 6, row: 2, fps: 4 },
  WRITE: { source: kittenAtlas, columns: 8, rows: 6, row: 2, fps: 5 },
  THINK: { source: kittenAtlas, columns: 8, rows: 6, row: 2, fps: 4 },
  CONFUSED: { source: kittenAtlas, columns: 8, rows: 6, row: 4, fps: 4 },
  SAD: { source: kittenAtlas, columns: 8, rows: 6, row: 4, fps: 4 },
  SLEEP: { source: kittenAtlas, columns: 8, rows: 6, row: 5, fps: 3 },
  HAPPY: { source: kittenAtlas, columns: 8, rows: 6, row: 3, fps: 7 },
  CELEBRATE: { source: kittenAtlas, columns: 8, rows: 6, row: 3, fps: 7 },
};

const MICRO_ANIMATIONS: Record<MicroAction, AnimationConfig> = {
  BLINK: { source: microAtlas, columns: 4, rows: 10, row: 0, fps: 4 },
  EAR_TWITCH: { source: microAtlas, columns: 4, rows: 10, row: 1, fps: 4 },
  TAIL_WAG: { source: microAtlas, columns: 4, rows: 10, row: 2, fps: 4 },
  HEAD_TILT: { source: microAtlas, columns: 4, rows: 10, row: 3, fps: 4 },
  LOOK_AROUND: { source: microAtlas, columns: 4, rows: 10, row: 4, fps: 4 },
  NOD: { source: microAtlas, columns: 4, rows: 10, row: 5, fps: 4 },
  TURN_FLASHCARD: { source: microAtlas, columns: 4, rows: 10, row: 6, fps: 4 },
  STRETCH: { source: microAtlas, columns: 4, rows: 10, row: 7, fps: 4 },
  YAWN: { source: microAtlas, columns: 4, rows: 10, row: 8, fps: 4 },
  DOZE_OFF: { source: microAtlas, columns: 4, rows: 10, row: 9, fps: 4 },
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

  //----------------------------------------
  // Load tất cả animation
  //----------------------------------------

  async load() {
    await Promise.all(
      (Object.entries(PET_ANIMATIONS) as [PetAction, AnimationConfig][]).map(async ([action, config]) => {
        const texture = await PIXI.Assets.load(config.source);
        this.configs.set(action, config);
        this.animations.set(action, this.buildFrames(texture, config));
      }),
    );

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

    // Keep the same point in the animation cycle when changing states. Starting
    // every sheet at frame 0 was the visible "jerk" between quiz reactions.
    const progress = this.sprite.totalFrames > 0
      ? this.sprite.currentFrame / this.sprite.totalFrames
      : 0;

    this.currentAction = action as PetAction;
    this.sprite.textures = frames;
    this.sprite.animationSpeed = (this.configs.get(action)?.fps ?? 6) / 60;
    this.sprite.loop = loop;
    this.sprite.onComplete = undefined;
    this.sprite.gotoAndPlay(Math.min(frames.length - 1, Math.floor(progress * frames.length)));
    this.fadeIn();
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

  private fadeIn() {
    this.sprite.alpha = 0.72;
    const startedAt = performance.now();
    const tick = () => {
      const progress = Math.min(1, (performance.now() - startedAt) / 140);
      this.sprite.alpha = 0.72 + 0.28 * progress;
      if (progress === 1) PIXI.Ticker.shared.remove(tick);
    };
    PIXI.Ticker.shared.add(tick);
  }

  private buildFrames(texture: PIXI.Texture, config: AnimationConfig) {
    const frameWidth = texture.width / config.columns;
    const frameHeight = texture.height / (config.rows ?? 1);
    const y = (config.row ?? 0) * frameHeight;

    const frames: PIXI.Texture[] = [];

    for (let i = 0; i < config.columns; i++) {
      frames.push(
        new PIXI.Texture({
          source: texture.source,
          frame: new PIXI.Rectangle(
            i * frameWidth,
            y,
            frameWidth,
            frameHeight,
          ),
        }),
      );
    }

    return frames;
  }
}
