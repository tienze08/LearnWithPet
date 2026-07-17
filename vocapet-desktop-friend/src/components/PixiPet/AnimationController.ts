import * as PIXI from "pixi.js";

import idleSprite from "@/assets/cat_idl.png";
import walkSprite from "@/assets/cat_walk.png";
import happySprite from "@/assets/cat_happy.png";
import sadSprite from "@/assets/cat_cry-removebg.png";
import sleepSprite from "@/assets/cat_sleep.png";

export type PetAction =
  | "IDLE"
  | "WALK"
  | "HAPPY"
  | "SAD"
  | "SLEEP"
  | "CELEBRATE"
  | "STUDY";

export const PET_SPRITES: Record<PetAction, string> = {
  IDLE: idleSprite,
  WALK: walkSprite,
  HAPPY: happySprite,
  SAD: sadSprite,
  SLEEP: sleepSprite,
  CELEBRATE: happySprite,
  STUDY: idleSprite,
};

export default class AnimationController {
  private animations = new Map<PetAction, PIXI.Texture[]>();

  private currentAction: PetAction | null = null;

  private sprite!: PIXI.AnimatedSprite;

  //----------------------------------------
  // Load tất cả animation
  //----------------------------------------

  async load() {
    for (const action of Object.keys(PET_SPRITES) as PetAction[]) {
      const texture = await PIXI.Assets.load(PET_SPRITES[action]);

      this.animations.set(action, this.buildFrames(texture));
    }

    this.sprite = new PIXI.AnimatedSprite(this.animations.get("IDLE")!);

    this.sprite.loop = true;

    this.sprite.animationSpeed = 0.15;

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

    const frames = this.animations.get(normalizedAction);

    if (!frames) return;

    this.currentAction = normalizedAction;

    this.sprite.textures = frames;

    this.sprite.gotoAndPlay(0);
  }

  //----------------------------------------

  private buildFrames(texture: PIXI.Texture) {
    const FRAME_COUNT = 8;

    const frameWidth = texture.width / FRAME_COUNT;

    const frameHeight = texture.height;

    const frames: PIXI.Texture[] = [];

    for (let i = 0; i < FRAME_COUNT; i++) {
      frames.push(
        new PIXI.Texture({
          source: texture.source,
          frame: new PIXI.Rectangle(
            i * frameWidth,
            0,
            frameWidth,
            frameHeight,
          ),
        }),
      );
    }

    return frames;
  }
}