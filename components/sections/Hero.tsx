"use client";

import { TransitionLink } from "@/components/transition/TransitionLink";
import { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { motion } from "@/lib/motion";
import { useStore } from "@/lib/store";

/**
 * HERO — a 340vh scroll track with a sticky viewport (the reference behaviour).
 * Scroll progress → motion.hero → camera dolly-out, nebula → beam, scene dims.
 * Copy A sits while the camera pulls back; copy B (the statement) reveals
 * word-by-word once we're out in the void.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const phase = useStore((s) => s.phase);

  // Scroll choreography (always on)
  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => (motion.hero = self.progress),
      });

      const words = SplitText.create(".hero-statement", { type: "words" }).words;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      tl.to(".hero-a", { yPercent: -18, autoAlpha: 0, ease: "power2.in", duration: 0.16 }, 0.5)
        .to(".hero-cue", { autoAlpha: 0, duration: 0.05 }, 0.05)
        .fromTo(".hero-b", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0.68)
        .fromTo(words, { opacity: 0.12 }, { opacity: 1, stagger: 0.008, duration: 0.04, ease: "none" }, 0.7)
        .fromTo(".hero-b-sub", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.86);
    },
    { scope: root },
  );

  // Entrance once the blast doors open
  useGSAP(
    () => {
      if (phase === "loading") return;
      const lines = SplitText.create(".hero-title", { type: "lines", mask: "lines", linesClass: "split-line" }).lines;
      gsap
        .timeline({ delay: 0.55 })
        .from(lines, { yPercent: 120, duration: 1.4, stagger: 0.1, ease: "expo.out" })
        .from(".hero-side > *", { autoAlpha: 0, x: 40, duration: 1, stagger: 0.08, ease: "expo.out" }, 0.3)
        .from(".hero-cue", { autoAlpha: 0, duration: 0.8 }, 0.9);
    },
    { scope: root, dependencies: [phase] },
  );

  return (
    <section ref={root} id="hero" data-section="00 // Signal" className="relative h-[340vh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* COPY A */}
        <div className="hero-a poster-grid absolute inset-0 content-end pb-[11vh] md:pb-[12vh]">
          <h1
            className="hero-title col-span-12 font-poster text-hero text-signal md:col-span-8"
            data-warp
          >
            We build
            <br />
            agents that
            <br />
            <span className="text-beige">do the</span>
            <br />
            <span className="text-beige">busywork</span>
          </h1>
          <div className="hero-side col-span-12 mt-6 flex flex-col items-start gap-5 md:col-span-4 md:mt-0 md:items-end md:self-end md:text-right">
            <p className="font-accent text-h3 text-beige">
              Answer · Book · Invoice ·
              <br />
              Follow up — while you
              <br />
              run the business.
            </p>
            <p className="max-w-[34ch] font-body text-base text-beige/70">
              AI agents for local businesses. Clinics, trades, salons, law offices, restaurants.
            </p>
            <TransitionLink href="/booking" data-magnetic data-cursor-label="GO" className="chamfer pointer-events-auto bg-beige px-5 py-3.5 font-label font-bold text-flag">
              Book a 20-min audit →
            </TransitionLink>
          </div>
        </div>

        <div className="hero-cue absolute bottom-[4.5vh] left-1/2 -translate-x-1/2 font-label text-signal">
          Scroll to descend ↓
        </div>

        {/* COPY B — appears in the void after the zoom-out */}
        <div className="hero-b poster-grid invisible absolute inset-0 content-between pb-[14vh] pt-[30vh]">
          <p className="hero-statement col-span-12 max-w-[22ch] font-accent text-h2 text-beige md:col-span-7">
            Every missed call. Every copy-paste. Every &ldquo;I&rsquo;ll get back to you.&rdquo; Handed to an agent that never clocks out.
          </p>
          <p className="hero-b-sub col-span-12 max-w-[30ch] justify-self-end text-right font-body text-lead text-beige/80 md:col-span-5">
            A small team of engineers and designers building AI staff for the businesses on your high street.
          </p>
        </div>
      </div>
    </section>
  );
}
