/**
 * One-shot signal fired by the Loader the instant the "JIDO" curtain splits.
 * The HUD, the hero and smooth scroll all wait for it, so the whole page
 * enters on the same beat as the curtain. No context, no store: just a callback list.
 */
let revealed = false;
const listeners = new Set<() => void>();

export function reveal() {
  if (revealed) return;
  revealed = true;
  listeners.forEach((fn) => fn());
  listeners.clear();
}

/** Runs `fn` on reveal (or right away if it already happened). Returns an unsubscribe. */
export function onReveal(fn: () => void) {
  if (revealed) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * How the intro plays on this page load (decided once, shared by Loader + HUD):
 *  - "full":  first page of the visit, the whole show.
 *  - "quick": reload or a fresh entry later in the same tab (Doherty threshold:
 *             nobody waits for the site twice).
 *  - "none":  moving between pages of this site, so the shared-element view
 *             transition carries the change and the frame simply stays put.
 */
export type IntroMode = "full" | "quick" | "none";
let mode: IntroMode | undefined;

export function introMode(): IntroMode {
  if (mode) return mode;
  let seen = false;
  try {
    seen = sessionStorage.getItem("jido:intro") === "1";
    sessionStorage.setItem("jido:intro", "1");
  } catch {
    /* storage blocked: treat as a first visit */
  }
  let internal = false;
  try {
    internal = !!document.referrer && new URL(document.referrer).origin === location.origin;
  } catch {
    /* unreadable referrer: not internal */
  }
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  mode = !seen ? "full" : internal && nav?.type === "navigate" ? "none" : "quick";
  return mode;
}
