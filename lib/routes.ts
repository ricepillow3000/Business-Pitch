import type { Stage } from "./motion";

/**
 * ROUTE → 3D CHOREOGRAPHY
 * Each route owns a camera + brain pose. On navigation GSAP tweens motion.stage
 * from the current pose to the next one, in lock-step with the DOM transition.
 * The home route additionally layers scroll choreography on top (homeWeight = 1).
 */
export const STAGES: Record<string, Stage> = {
  "/": {
    camX: 0, camY: 0.15, camZ: 4.6, fov: 34, lookX: 0, lookY: 0,
    brainX: 0, brainY: 0, brainRot: 0, brainScale: 1, dim: 1, labels: 0, activity: 0,
  },
  // Pricing: brain swings to the left and turns in profile; the 5 agent hubs light up
  // so the plans on the right read as "which parts of the brain you're buying".
  "/pricing": {
    camX: 0.2, camY: 0.1, camZ: 6.2, fov: 32, lookX: 0, lookY: 0,
    brainX: -2.25, brainY: 0.05, brainRot: -0.9, brainScale: 1.08, dim: 0.85, labels: 1, activity: 0.6,
  },
  // Booking: brain retreats far up-right and dims, a quiet beacon behind the form.
  "/booking": {
    camX: 0, camY: 0.4, camZ: 12, fov: 30, lookX: 0, lookY: 0.4,
    brainX: 3.6, brainY: 2.2, brainRot: 0.6, brainScale: 0.85, dim: 0.5, labels: 0, activity: 0.25,
  },
};

export const stageFor = (path: string) => STAGES[path.replace(/\/$/, "") || "/"] ?? STAGES["/"];

/** Routes prefetched on idle after the loader — the "next logical" destinations. */
export const PREFETCH_ROUTES = ["/booking", "/pricing", "/"];
