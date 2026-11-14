import type Lenis from "lenis";

/** The running Lenis instance (set by SmoothScroll), for components that need to scroll the page. */
export const smooth: { lenis: Lenis | null } = { lenis: null };
