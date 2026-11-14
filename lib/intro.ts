/**
 * INTRO SYNC CONSTANTS — single source of truth for the loader → hero handoff.
 * Every timing below is measured from the "open" label (the moment the curtain doors part).
 * The Preloader's master GSAP timeline, the R3F mannequin and the DOM fade all read these,
 * so changing one number re-times everything together.
 *
 *  open ─┬─ curtain halves slide out ............ 0.00 → 1.30
 *        ├─ mannequin Z approach (expo.out) ..... 0.00 → APPROACH
 *        ├─ seam crack glows .................... SPLIT_AT-0.5 → SPLIT_AT
 *        ├─ head split (morph targets) .......... SPLIT_AT → SPLIT_AT+SPLIT_DUR
 *        └─ DOM UI opacity 0 → 1 ................ SPLIT_AT → SPLIT_AT+SPLIT_DUR   ← same window
 */
export const INTRO = {
  /** seconds the bust takes to travel from the void to its hero mark */
  APPROACH: 3.4,
  /** when the head starts to open (and the UI starts fading in) */
  SPLIT_AT: 1.5,
  /** how long the split + UI fade take; head is fully open exactly when the UI is fully visible */
  SPLIT_DUR: 1.8,
  /** where the bust starts on Z (deep in the void) */
  Z_START: -38,
};
