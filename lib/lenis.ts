import type Lenis from "lenis";
/** Module singleton so any component can start/stop/scrollTo. */
export const lenisRef: { current: Lenis | null } = { current: null };
