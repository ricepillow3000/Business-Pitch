/**
 * JIDO mark: square blocks aligned on a grid to build the letter J,
 * with a circuit trace running out of the stem to a node.
 * Each block carries [data-block] so the HUD can assemble them on reveal.
 * Everything uses currentColor (beige by default, per the palette).
 */

// The J on a 5 × 6 grid (col, row)
const J: [number, number][] = [
  [1, 0], [2, 0], [3, 0], [4, 0], // top bar
  [3, 1], [3, 2], [3, 3],         // stem
  [0, 3], [0, 4], [3, 4],         // hook sides
  [1, 5], [2, 5],                 // base
];
const SIZE = 5;
const STEP = 6.2; // block + gap
const O = 2; // offset inside the viewBox

export const MARK_BLOCKS = J.length;

export function Mark({ className = "h-7 w-7 text-beige", ...pos }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  const stemRight = O + 3 * STEP + SIZE;
  const traceY = O + 2 * STEP + SIZE / 2;
  return (
    <svg viewBox="0 0 40 40" className={className} fill="currentColor" aria-hidden {...pos}>
      {J.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          data-block
          x={O + c * STEP}
          y={O + r * STEP}
          width={SIZE}
          height={SIZE}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}
      {/* circuit trace → node */}
      <g data-trace fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d={`M${stemRight} ${traceY} H31 L35 ${traceY + 4}`} />
        <circle cx="35.6" cy={traceY + 6.4} r="2" />
      </g>
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
