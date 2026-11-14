"use client";

import { TransitionLink } from "@/components/transition/TransitionLink";
import { useRef } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { motion } from "@/lib/motion";
import { BRAND } from "@/lib/config";

/** 07 — The camera flies back down to the orb; the closing line wraps around it. */
export function Cta() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "center center",
        scrub: true,
        onUpdate: (s) => (motion.cta = s.progress),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="cta" data-section="07 // Hand-off" className="relative flex min-h-[130svh] items-center justify-center py-[12vh]">
      <div className="pointer-events-none text-center">
        <p className="font-label text-signal">[07] ── Ready when you are</p>
        <h2 data-scale className="mt-6 font-poster text-mega text-beige" data-warp>
          Hand it
          <br />
          <span className="text-outline">off.</span>
        </h2>
        <div className="pointer-events-auto mt-12 flex flex-col items-center gap-5">
          <TransitionLink href="/booking" data-magnetic data-cursor-label="GO" className="chamfer bg-beige px-8 py-5 font-label text-sm font-bold text-flag">
            {BRAND.cta} →
          </TransitionLink>
          <p className="font-body text-beige/70">20 minutes. No pitch deck. We map your busywork and tell you what an agent can take.</p>
        </div>
      </div>
    </section>
  );
}
