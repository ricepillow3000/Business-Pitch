import type { Stage } from "./motion";

/**
 * ROUTE → 3D CHOREOGRAPHY
 * Each route owns a camera + subject pose. On navigation GSAP tweens motion.stage
 * from the current pose to the next one, in lock-step with the DOM transition.
 * The home route additionally layers scroll choreography on top (homeWeight = 1).
 */
export const STAGES: Record<string, Stage> = {
  // Home: low camera in the valley, orb dead centre, the storm and impact below it.
  "/": {
    camX: 0, camY: 1.7, camZ: 9.5, fov: 34, lookX: 0, lookY: 1.8,
    subjectX: 0, subjectY: 0, subjectRot: 0, subjectScale: 1, dim: 1, activity: 0,
  },
  // Pricing: the scene slides left so the plans on the right have clean air.
  "/pricing": {
    camX: 0, camY: 2.2, camZ: 12.5, fov: 32, lookX: 0, lookY: 1.9,
    subjectX: -3.6, subjectY: 0, subjectRot: 0.35, subjectScale: 1, dim: 0.8, activity: 0.5,
  },
  // Booking: far and high, dim — a quiet beacon in the valley behind the form.
  "/booking": {
    camX: 0, camY: 7.5, camZ: 30, fov: 30, lookX: 0, lookY: 1.5,
    subjectX: 4.5, subjectY: 0, subjectRot: -0.3, subjectScale: 1, dim: 0.5, activity: 0.2,
  },
};

export const stageFor = (path: string) => STAGES[path.replace(/\/$/, "") || "/"] ?? STAGES["/"];

/** Routes prefetched on idle after the loader — the "next logical" destinations. */
export const PREFETCH_ROUTES = ["/booking", "/pricing", "/"];
