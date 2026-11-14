/**
 * INTRO SYNC CONSTANTS — single source of truth for the loader → hero handoff.
 * Every timing below is measured from the "open" label (the moment the curtain halves part).
 * The Preloader's master GSAP timeline, the R3F moon scene and the DOM fade all read these,
 * so changing one number re-times everything together.
 *
 *  100% ─ loader word rushes at the viewer (scale → RUSH_SCALE, expo.in)
 *  open ─┬─ curtain halves slide out ............ 0.00 → 1.30
 *        ├─ motion.reveal 0 → 1 (scene) ......... REVEAL_AT → REVEAL_AT+REVEAL_DUR   ┐ identical
 *        └─ DOM UI opacity 0 → 1 ................ REVEAL_AT → REVEAL_AT+REVEAL_DUR   ┘ window + ease
 */
export const INTRO = {
  /** how big the loader word gets as it "reaches through the screen" */
  RUSH_SCALE: 5.5,
  /** offset from "open" where the scene reveal + UI fade both start */
  REVEAL_AT: 0,
  /** duration shared by the scene reveal and the UI fade */
  REVEAL_DUR: 2.2,
  /** shared ease, so both curves are the same shape, not just the same window */
  REVEAL_EASE: "power2.inOut",
};
