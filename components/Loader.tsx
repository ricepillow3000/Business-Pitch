"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { introMode, reveal } from "@/lib/intro";

/*
 * THE "JIDO" INTRO
 *
 *  t ─────────────────────────────────────────────────────────────────────▶
 *  │ word fades up │ 000% ──▶ 100% │ % fades │
 *                                  │ REACH: scale 1 → 1.6 ("reach", 0.9s) │
 *                                                                         │ SPLIT ("split", 1.2s)
 *                                                                         │  JI  ──▶ off left
 *                                                                         │  DO  ──▶ off right
 *                                                                         │  scale 1.6 → 2.4
 *                                                                         │  background 1 → 0
 *                                                                         │  reveal() → hero + HUD enter
 *
 * Why the numbers line up: "reach" ends with slope 6.25, "split" starts with
 * slope 6.25 (see lib/gsap.ts). Scale speed at the seam:
 *     reach: 6.25 × 0.6 / 0.9s = 4.17/s      split: 6.25 × 0.8 / 1.2s = 4.17/s
 * Same speed on both sides, so the word never hitches at the peak: it lunges
 * at you and bursts apart in a single motion. The background fade and the
 * hero entrance use the SAME ease, duration and start label as the split.
 */
const REACH = 0.9;
const SPLIT = 1.2;

const pct = (v: number) => `${String(Math.round(v)).padStart(3, "0")}%`;

export function Loader() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      history.scrollRestoration = "manual";
      window.scrollTo(0, 0);

      const q = gsap.utils.selector(root);
      const [bg, word, left, right, count] = ["bg", "word", "left", "right", "count"].map((k) => q(`[data-${k}]`)[0]);
      const off = () => window.innerWidth; // children of a scaled parent: this is always far enough

      const finish = () => {
        gsap.set(root.current, { pointerEvents: "none" });
        reveal();
      };

      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.to(root.current, { autoAlpha: 0, duration: 0.4, delay: 0.2, onStart: finish });
        return;
      }

      const intro = introMode();
      const seen = intro !== "full";
      root.current!.dataset.intro = intro;
      if (intro === "none") {
        // moving between pages of this site: no curtain, the view transition does the work
        gsap.set(root.current, { display: "none" });
        finish();
        return;
      }

      const progress = { v: 0 };
      const tl = gsap.timeline({ paused: true, onComplete: () => gsap.set(root.current, { display: "none" }) });

      tl.from(word, { autoAlpha: 0, yPercent: 12, duration: seen ? 0.5 : 1.2 })
        .from(count, { autoAlpha: 0, duration: seen ? 0.2 : 0.6 }, seen ? 0.05 : 0.2)
        .to(progress, {
          v: 100,
          duration: seen ? 0.4 : 1.8,
          ease: "power2.inOut",
          onUpdate: () => void (count.textContent = pct(progress.v)),
        }, seen ? 0.05 : 0.2)

        // 100% → numbers fade, word reaches toward the viewer
        .to(count, { autoAlpha: 0, y: 6, duration: 0.35, ease: "power2.in" }, ">+0.1")
        .to(word, { scale: 1.6, duration: REACH, ease: "reach" }, "<")

        // peak → the word fractures, the curtain opens
        .addLabel("split")
        .call(() => void tl.timeScale(1), [], "split") // a skipped intro still splits at full grace
        .call(finish, [], "split")
        .to(word, { scale: 2.4, duration: SPLIT, ease: "split" }, "split")
        .to(left, { x: () => -off(), duration: SPLIT, ease: "split" }, "split")
        .to(right, { x: () => off(), duration: SPLIT, ease: "split" }, "split")
        .to(bg, { autoAlpha: 0, duration: SPLIT, ease: "split" }, "split");

      // Interruptible: a click, key, scroll or tap fast-forwards smoothly to the split
      // (speeds the running timeline up instead of jumping, so nothing pops).
      const skip = () => {
        if (tl.time() < tl.labels.split) gsap.to(tl, { timeScale: 6, duration: 0.2, overwrite: true });
        stopListening();
      };
      const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
      const stopListening = () => events.forEach((e) => removeEventListener(e, skip));
      events.forEach((e) => addEventListener(e, skip, { passive: true }));

      let alive = true;
      document.fonts.ready.then(() => {
        if (alive) tl.play();
      });
      return () => {
        alive = false;
        stopListening();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} data-loader className="fixed inset-0 z-[100] grid place-items-center overflow-hidden" aria-hidden>
      <div data-bg className="absolute inset-0 bg-slate" />
      {/* optical centre: a block of text looks centred slightly ABOVE the true middle */}
      <div data-optical className="relative -mt-[8vh] flex flex-col items-center">
        <div data-word className="flex font-wide text-[clamp(5rem,21vw,24rem)] leading-none font-[500] text-beige will-change-transform">
          <span data-left className="block">JI</span>
          <span data-right className="block">DO</span>
        </div>
        <p data-count className="mt-6 font-hud text-flag">000%</p>
      </div>
      <noscript>
        <style>{`[data-loader]{display:none}`}</style>
      </noscript>
    </div>
  );
}
