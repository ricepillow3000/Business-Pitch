import { Vector3 } from "three";

/**
 * Per-frame shared state. Deliberately a plain mutable object (NOT React state):
 * the DOM layer (GSAP/Lenis/router) writes, the WebGL layer (useFrame) reads,
 * and nothing re-renders. This is the bridge between the two worlds.
 */
export type Stage = {
  camX: number; camY: number; camZ: number; fov: number;
  lookX: number; lookY: number;
  brainX: number; brainY: number; brainRot: number; brainScale: number;
  dim: number;    // 0..1 scene brightness
  labels: number; // 0..1 agent hub callouts
  activity: number;
};

export const motion = {
  /** 0 → 1 while the home hero track scrolls (camera dolly-out) */
  hero: 0,
  /** 0 → 1 while the home CTA approaches (camera returns) */
  cta: 0,
  /** 0 → 1 scene brightness fade-in after the curtain opens */
  intro: 0,
  /** 0 → 1 mannequin travels from INTRO.Z_START to its mark (GSAP applies the ease) */
  approach: 0,
  /** 0 → 1 glowing crack along the head seam, just before it opens */
  crack: 0,
  /** 0 → 1 head split; drives the morph-target (shape key) weights */
  split: 0,
  /** 1 on the home route (scroll choreography drives the camera), 0 elsewhere (route preset drives it). Tweened. */
  homeWeight: 1,
  /** Route-driven camera/brain pose. Tweened by GSAP on navigation — see lib/routes.ts */
  stage: {
    camX: 0, camY: 0, camZ: 4.6, fov: 34, lookX: 0, lookY: 0,
    brainX: 0, brainY: 0, brainRot: 0, brainScale: 1, dim: 1, labels: 0, activity: 0,
  } as Stage,
  /** lenis velocity, smoothed */
  velocity: 0,
  /** normalized pointer, -1..1 */
  pointer: { x: 0, y: 0 },
  /** pointer in uv space 0..1 (y up) for the lens shader. Starts off-screen so the
   *  cursor light never parks behind the mannequin before the user moves the mouse. */
  pointerUv: { x: -1, y: -1 },
  /** pointer speed (px/frame, smoothed) */
  pointerSpeed: 0,
  /** 1 while hovering a warp/magnetic target */
  hoverBoost: 0,
};

/** World-space point the depth of field focuses on (the face / split). Written by HeroRig. */
export const focusPoint = new Vector3(0, 0.5, 0);

/** DOM nodes for the 5 hub callouts; the WebGL layer projects + positions them each frame. */
export const hubLabelEls: (HTMLDivElement | null)[] = [];
