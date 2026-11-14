"use client";

import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { useStore } from "@/lib/store";
import { usePathname } from "next/navigation";

/**
 * Declarative scroll construction. Add attributes in markup, get motion:
 *   data-split          → lines rise out of masks
 *   data-mask="up|left|center" → element is "constructed" by an expanding clip-path
 *   data-scale          → poster type scales up + tracks in as it scrolls through (scrubbed)
 *   data-strike         → beige bar strikes the line through (scrubbed)
 * Runs once the loader has opened so measurements use final fonts.
 */
export function Reveals() {
  const phase = useStore((s) => s.phase);
  const pathname = usePathname();

  useGSAP(
    () => {
      if (phase === "loading") return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.utils.toArray<HTMLElement>("[data-split]:not([data-enter])").forEach((el) => {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 115,
              rotate: 2,
              duration: 1.2,
              stagger: 0.08,
              ease: "expo.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }),
        });
      });

      const clips: Record<string, string> = {
        up: "inset(100% 0% 0% 0%)",
        left: "inset(0% 100% 0% 0%)",
        center: "inset(50% 50% 50% 50%)",
      };
      gsap.utils.toArray<HTMLElement>("[data-mask]").forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: clips[el.dataset.mask || "up"] },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 92%", end: "top 40%", scrub: 0.6 },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-scale]").forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.62, letterSpacing: "0.08em", transformOrigin: "50% 100%" },
          {
            scale: 1,
            letterSpacing: "-0.035em",
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "top 35%", scrub: 0.8 },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-strike]").forEach((el) => {
        const bar = el.querySelector(".strike-bar");
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top 70%", end: "top 45%", scrub: 0.5 } })
          .fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: "none" })
          .to(el.querySelector(".strike-text"), { color: "#4a535a", ease: "none" }, 0);
      });

      ScrollTrigger.refresh();
    },
    { dependencies: [phase, pathname] },
  );

  return null;
}
