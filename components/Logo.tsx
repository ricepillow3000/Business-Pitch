/**
 * JIDO logo, redrawn as a vector from the brand mark: a blocky "J" glyph
 * with a circuit trace ending in a node, beside a spaced monospace wordmark.
 * Everything uses currentColor (beige by default, per the palette).
 */
export function Mark({ className = "h-7 w-7 text-beige", ...pos }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="currentColor" aria-hidden {...pos}>
      {/* tab */}
      <rect x="7.5" y="3.5" width="7" height="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {/* top bar + stem */}
      <rect x="4" y="10" width="20" height="4.5" />
      <rect x="13" y="10" width="5.5" height="23" />
      {/* hook of the J */}
      <rect x="5" y="28.5" width="8" height="4.5" />
      <rect x="5" y="24" width="4" height="4.5" />
      {/* notches */}
      <rect x="20" y="17" width="2.5" height="2.5" />
      <rect x="9.5" y="17" width="2" height="5" />
      {/* circuit trace → node */}
      <path d="M18.5 22.5 H27 L32 27.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="33.6" cy="29" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
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
