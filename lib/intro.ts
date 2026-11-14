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
