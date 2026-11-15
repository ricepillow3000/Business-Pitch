"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { onReveal } from "@/lib/intro";
import { Logo } from "./Logo";
import { Plus } from "./Plus";

/**
 * Global tactical frame. Two thin bars (top + bottom) share the page's own
 * background, so content slides *under* them and never collides with the HUD.
 *
 * Top bar:    + JIDO ............................ CONTACT +
 * Bottom bar: + ■ FRICTION .......................  SCR 042% +
 *
 * The bottom label only shows while a section fills the screen: it hides
 * between sections and scrambles in with the next one's name.
 */
export function HUD() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const q = (k: string) => root.current!.querySelector<HTMLElement>(`[data-${k}]`)!;
      const [label, text, scroll] = [q("hud-label"), q("hud-text"), q("scroll")];

      gsap.set(label, { autoAlpha: 0 });
      let triggers: ScrollTrigger[] = [];
      let shown = "";
      const sync = () => {
        const active = triggers.find((t) => t.isActive);
        const name = active ? (active.trigger as HTMLElement).dataset.label ?? "" : "";
        if (name === shown) return;
        shown = name;
        if (!name) return void gsap.to(label, { autoAlpha: 0, duration: 0.35, overwrite: true });
        gsap.to(label, { autoAlpha: 1, duration: 0.35, overwrite: true });
        gsap.to(text, { duration: 0.8, scrambleText: { text: name, chars: "0123456789/#_", speed: 0.5 }, overwrite: true });
      };

      // A section counts as "on screen" once it covers the middle 40% of the viewport.
      triggers = [...document.querySelectorAll<HTMLElement>("[data-section]")].map((el) =>
        ScrollTrigger.create({ trigger: el, start: "top 30%", end: "bottom 70%", onToggle: sync }),
      );
      sync();

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

  const corner = <span data-corner className="block h-[13px] w-[13px] shrink-0"><Plus /></span>;

  return (
    <div ref={root} className="pointer-events-none fixed inset-0 z-50 text-flag">
      {/* top bar */}
      <div data-hud-bar className="hud-bar absolute inset-x-0 top-0 flex h-14 items-center gap-3 border-b border-slate-line px-4 md:h-[72px] md:gap-5 md:px-6">
        {corner}
        <a href="#top" data-fade aria-label="JIDO, back to top" className="pointer-events-auto">
          <Logo markClassName="h-7 w-7" />
        </a>
        <a href="#initiation" data-fade className="pointer-events-auto ml-auto font-hud">Contact</a>
        {corner}
      </div>

      {/* bottom bar */}
      <div data-hud-bar className="hud-bar absolute inset-x-0 bottom-0 flex h-12 items-center gap-3 border-t border-slate-line px-4 md:h-16 md:gap-5 md:px-6">
        {corner}
        <p data-fade className="font-hud">
          <span data-hud-label className="inline-flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 bg-beige" />
            <span data-hud-text>OVERVIEW</span>
          </span>
        </p>
        <p data-fade className="ml-auto font-hud">
          SCR <span data-scroll>000</span>%
        </p>
        {corner}
      </div>

      {/* edge micro-data, set vertically (wide screens only, where the margins have room for it) */}
      <p data-fade className="absolute top-1/2 left-6 hidden -translate-y-1/2 rotate-180 font-hud whitespace-nowrap opacity-60 [writing-mode:vertical-rl] lg:block">
        SYS.LINK // STABLE &nbsp;·&nbsp; 0x7F3A-02C9 &nbsp;·&nbsp; E1B4 9C07 33AF
      </p>
      <p data-fade className="absolute top-1/2 right-6 hidden -translate-y-1/2 font-hud whitespace-nowrap opacity-60 [writing-mode:vertical-rl] lg:block">
        JIDO.OPS // AUTOMATION SYSTEMS &nbsp;·&nbsp; 4C1D-A8E2 &nbsp;·&nbsp; BUILD 1.2.0
      </p>
    </div>
  );
}
