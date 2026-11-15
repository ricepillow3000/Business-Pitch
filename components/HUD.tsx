"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { onReveal } from "@/lib/intro";
import { Logo } from "./Logo";
import { Plus } from "./Plus";

/** One slot-machine reel: a 0–9 strip inside a one-digit window. */
function Reel() {
  return (
    <span className="inline-block h-[1em] overflow-hidden align-top">
      <span data-reel className="flex flex-col">
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} className="block h-[1em] leading-none">{d}</span>
        ))}
      </span>
    </span>
  );
}

/**
 * Global tactical frame: crosshairs in the corners, rotated micro-data on the
 * edges, and [[00X]] pagination that rolls like a slot machine as sections pass.
 * Reads sections from the DOM (`[data-section]` + `data-label`), so the page
 * owns its content and the HUD only observes it.
 */
export function HUD() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const reels = gsap.utils.toArray<HTMLElement>("[data-reel]", root.current);
      const [label, loc, scroll] = ["hud-label", "loc", "scroll"].map((k) => root.current!.querySelector<HTMLElement>(`[data-${k}]`)!);

      const go = (index: number, text: string) => {
        const digits = String(index + 1).padStart(3, "0");
        reels.forEach((reel, i) =>
          gsap.to(reel, { yPercent: -10 * Number(digits[i]), duration: 0.9, ease: "expo.inOut", overwrite: true }),
        );
        gsap.to(label, { duration: 0.8, scrambleText: { text, chars: "0123456789/#_", speed: 0.5 }, overwrite: true });
        loc.textContent = digits;
      };

      document.querySelectorAll<HTMLElement>("[data-section]").forEach((el, i) =>
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => self.isActive && go(i, el.dataset.label ?? ""),
        }),
      );

      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => void (scroll.textContent = String(Math.round(self.progress * 100)).padStart(3, "0")),
      });

      // Enter on the curtain split: corners snap in from the outside, data fades up.
      gsap.set("[data-corner]", { scale: 2.5, autoAlpha: 0 });
      gsap.set("[data-fade]", { autoAlpha: 0 });
      // Logo: the blocks start scattered and snap into alignment to form the J.
      gsap.set("[data-block]", {
        x: () => gsap.utils.random(-28, 28),
        y: () => gsap.utils.random(-28, 28),
        rotation: () => gsap.utils.random(-90, 90),
        autoAlpha: 0,
      });
      return onReveal(
        contextSafe!(() => {
          gsap.to("[data-corner]", { scale: 1, autoAlpha: 1, duration: 1.2, ease: "split", stagger: 0.06 });
          gsap.to("[data-fade]", { autoAlpha: 1, duration: 1, delay: 0.5, stagger: 0.08 });
          gsap.to("[data-block]", { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 1.1, delay: 0.5, ease: "expo.inOut", stagger: { each: 0.04, from: "random" } });
        }),
      );
    },
    { scope: root },
  );

  return (
    <div ref={root} className="pointer-events-none fixed inset-0 z-50 text-flag">
      {/* corners */}
      <span data-corner className="absolute top-4 left-4 h-[13px] w-[13px] md:top-6 md:left-6"><Plus /></span>
      <span data-corner className="absolute top-4 right-4 h-[13px] w-[13px] md:top-6 md:right-6"><Plus /></span>
      <span data-corner className="absolute bottom-4 left-4 h-[13px] w-[13px] md:bottom-6 md:left-6"><Plus /></span>
      <span data-corner className="absolute right-4 bottom-4 h-[13px] w-[13px] md:right-6 md:bottom-6"><Plus /></span>

      {/* top bar */}
      <a href="#top" data-fade aria-label="JIDO, back to top" className="pointer-events-auto absolute top-2 left-10 md:top-[14px] md:left-14">
        <Logo markClassName="h-7 w-7" />
      </a>
      <a href="#initiation" data-fade className="pointer-events-auto absolute top-3.5 right-10 font-hud md:top-6 md:right-14">
        Contact
      </a>

      {/* pagination */}
      <div data-fade className="absolute bottom-3.5 left-10 flex items-baseline gap-3 md:bottom-6 md:left-14">
        <span className="font-mono text-xs leading-none tracking-wider text-beige">
          [[<Reel />
          <Reel />
          <Reel />]]
        </span>
        <span data-hud-label className="font-hud">OVERVIEW</span>
      </div>

      {/* scroll readout */}
      <p data-fade className="absolute right-10 bottom-3.5 font-hud md:right-14 md:bottom-6">
        SCR <span data-scroll>000</span>%
      </p>

      {/* edge micro-data, set vertically (desktop only: keep phones clean) */}
      <p data-fade className="absolute top-1/2 left-6 hidden -translate-y-1/2 rotate-180 font-hud whitespace-nowrap opacity-70 [writing-mode:vertical-rl] md:block">
        SYS.LOC // <span data-loc>001</span> &nbsp;·&nbsp; 0x7F3A-02C9 &nbsp;·&nbsp; E1B4 9C07 33AF
      </p>
      <p data-fade className="absolute top-1/2 right-6 hidden -translate-y-1/2 font-hud whitespace-nowrap opacity-70 [writing-mode:vertical-rl] md:block">
        JIDO.OPS // AUTOMATION SYSTEMS &nbsp;·&nbsp; 4C1D-A8E2 &nbsp;·&nbsp; BUILD 1.1.0
      </p>
    </div>
  );
}
