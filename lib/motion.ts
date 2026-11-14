import { Vector3 } from "three";

/**
 * Per-frame shared state. Deliberately a plain mutable object (NOT React state):
 * the DOM layer (GSAP/Lenis/router) writes, the WebGL layer (useFrame) reads,
 * and nothing re-renders. This is the bridge between the two worlds.
 */
export type Stage = {
  camX: number; camY: number; camZ: number; fov: number;
  lookX: number; lookY: number;
  /** where the whole moon scene (orb + beam + storm + terrain) sits for this route */
  subjectX: number; subjectY: number; subjectRot: number; subjectScale: number;
  dim: number;      // 0..1 scene brightness
  activity: number; // 0..1 extra turbulence in the orb / storm
};

/** Which clickable object the pointer is over (3D raycast OR its DOM hotspot). */
export type HoverTarget = "none" | "core" | "engine";

export const motion = {
  /** 0 → 1 while the home hero track scrolls (camera dolly-out) */
  hero: 0,
  /** 0 → 1 while the home CTA approaches (camera returns) */
  cta: 0,
  /**
   * 0 → 1 the moon scene reveal after the curtain opens: orb ignites, beam strikes,
   * dust bursts outward, the storm spins up, the camera settles. Tweened by the
   * Preloader with the SAME position/duration/ease as the website fade-in.
   */
  reveal: 0,
  /** 1 on the home route (scroll choreography drives the camera), 0 elsewhere (route preset drives it). Tweened. */
  homeWeight: 1,
  /** Route-driven camera/subject pose. Tweened by GSAP on navigation — see lib/routes.ts */
  stage: {
    camX: 0, camY: 1.7, camZ: 9.5, fov: 34, lookX: 0, lookY: 1.8,
    subjectX: 0, subjectY: 0, subjectRot: 0, subjectScale: 1, dim: 1, activity: 0,
  } as Stage,
  /** 0 → 1 camera eases toward the object whose info panel is open (tweened by InfoPanel) */
  focus: 0,
  /** which object the camera eases toward while a panel is open */
  focusTarget: "core" as Exclude<HoverTarget, "none">,
  /** hovered clickable object (written by the 3D proxies and the DOM hotspots) */
  hover: "none" as HoverTarget,
  /** lenis velocity, smoothed */
  velocity: 0,
  /** normalized pointer, -1..1 */
  pointer: { x: 0, y: 0 },
  /** pointer in uv space 0..1 (y up) for the lens shader. Starts off-screen. */
  pointerUv: { x: -1, y: -1 },
  /** pointer speed (px/frame, smoothed) */
  pointerSpeed: 0,
  /** 1 while hovering a warp/magnetic target */
  hoverBoost: 0,
};

/** World-space point the depth of field focuses on (the orb). Written by MoonScene. */
export const focusPoint = new Vector3(0, 2.4, 0);

/** DOM hotspot buttons; MoonScene projects the orb / storm to screen space and moves them each frame. */
export const hotspotEls: { core: HTMLElement | null; engine: HTMLElement | null } = { core: null, engine: null };
