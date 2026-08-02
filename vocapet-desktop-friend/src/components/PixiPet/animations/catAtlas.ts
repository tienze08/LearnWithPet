import * as PIXI from "pixi.js";

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PetAction =
  | "IDLE"
  | "WALK"
  | "HAPPY"
  | "SAD"
  | "SLEEP"
  | "CELEBRATE"
  | "STUDY";

export interface AnimationAtlas {
    frames: FrameRect[];
    speed?: number;
    loop?: boolean;
}

export const CAT_ATLAS: Record<PetAction, AnimationAtlas> = {
    IDLE: {
        frames: [],
        speed: 0.12,
        loop: true,
    },

    WALK: {
        frames: [],
        speed: 0.18,
        loop: true,
    },

    HAPPY: {
        frames: [],
        speed: 0.18,
        loop: true,
    },

    SAD: {
        frames: [],
        speed: 0.12,
        loop: true,
    },

    SLEEP: {
        frames: [],
        speed: 0.08,
        loop: true,
    },

    CELEBRATE: {
        frames: [],
        speed: 0.2,
        loop: true,
    },

    STUDY: {
        frames: [],
        speed: 0.15,
        loop: true,
    },
};

