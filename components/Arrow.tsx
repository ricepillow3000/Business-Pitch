/**
 * Thin arrow, drawn in the same 1px line as the crosshair (Plus), so every icon on the
 * site is one family. "up-right" marks a link that opens in a new tab.
 */
const PATHS = {
  "up-right": "M2 11 11 2M4.5 2H11V8.5",
  down: "M6.5 0V12M1.5 7l5 5 5-5",
  up: "M6.5 13V1M1.5 6l5-5 5 5",
} as const;

export function Arrow({ dir = "up-right" }: { dir?: keyof typeof PATHS }) {
  return (
    <svg
      viewBox="0 0 13 13"
      data-icon={dir === "up-right" ? "external" : "arrow"}
      className="inline-block h-[0.75em] w-[0.75em] shrink-0 align-[-0.02em]"
      aria-hidden
    >
      <path d={PATHS[dir]} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
