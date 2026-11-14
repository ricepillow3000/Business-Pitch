"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { motion } from "@/lib/motion";

/**
 * Typography warp: hovering any [data-warp] element routes it through an SVG
 * turbulence + displacement filter. Displacement scales with pointer speed,
 * so fast passes ripple the letters like they're under a liquid lens.
 */
export function WarpFilter() {
  const turb = useRef<SVGFETurbulenceElement>(null);
  const disp = useRef<SVGFEDisplacementMapElement>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let active: HTMLElement | null = null;
    const amt = { v: 0 };

    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-warp]");
      if (el === active) return;
      if (active) {
        const prev = active;
        gsap.to(amt, { v: 0, duration: 0.5, ease: "power3.out", overwrite: true, onComplete: () => (prev.style.filter = "") });
      }
      active = el;
      if (el) {
        el.style.filter = "url(#warp)";
        gsap.to(amt, { v: 1, duration: 0.4, ease: "power2.out", overwrite: true });
      }
    };
    const tick = (time: number) => {
      if (!disp.current || !turb.current) return;
      const speed = Math.min(motion.pointerSpeed / 40, 1);
      disp.current.setAttribute("scale", String(amt.v * (6 + speed * 38)));
      const f = 0.006 + Math.sin(time * 1.3) * 0.002;
      turb.current.setAttribute("baseFrequency", `${f} ${f * 6}`);
    };
    addEventListener("pointerover", onOver, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      removeEventListener("pointerover", onOver);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
      <filter id="warp" x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.006 0.036" numOctaves={1} seed={4} result="n" />
        <feDisplacementMap ref={disp} in="SourceGraphic" in2="n" scale={0} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
