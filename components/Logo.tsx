/**
 * JIDO mark: 10 square blocks aligned on a 4 × 5 grid to build the letter J.
 *
 *    ■ ■ ■ ■
 *          ■
 *          ■
 *    ■     ■
 *      ■ ■
 *
 * Each block carries [data-block] so the HUD can snap them into place on reveal.
 * Everything uses currentColor (beige by default, per the palette).
 */
export const J_BLOCKS: [number, number][] = [
  [0, 0], [1, 0], [2, 0], [3, 0], // top bar
  [3, 1], [3, 2],                 // stem
  [0, 3], [3, 3],                 // hook sides
  [1, 4], [2, 4],                 // base
];
const SIZE = 6;
const STEP = 7.6; // block + gap
const OX = (40 - (3 * STEP + SIZE)) / 2; // centred in the 40 × 40 viewBox
const OY = (40 - (4 * STEP + SIZE)) / 2;

export function Mark({ className = "h-7 w-7 text-beige", ...pos }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="currentColor" aria-hidden {...pos}>
      {J_BLOCKS.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          data-block
          x={OX + c * STEP}
          y={OY + r * STEP}
          width={SIZE}
          height={SIZE}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}
    </svg>
  );
}

export function Logo({ className = "", markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 text-beige ${className}`}>
      <Mark className={markClassName} />
      <span className="font-mono text-[0.8125rem] leading-none tracking-[0.5em]">JIDO</span>
    </span>
  );
}
