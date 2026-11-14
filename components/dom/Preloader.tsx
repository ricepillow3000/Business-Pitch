"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { motion } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { BRAND } from "@/lib/config";

/**
 * LOADER SEQUENCE
 *  1. Brand name = progress bar. Outline text, beige fill clipped left→right by progress.
 *  2. 100% → the word scales toward the viewer with an expo.in ease (slow, heavy, then rushing).
 *  3. A seam flashes down the middle, two stepped glitch-jolts, then the two halves
 *     (each a clip-path'd copy of the whole loader) slam apart like blast doors.
 *  4. WebGL camera intro starts as the doors open.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const sceneReady = useStore((s) => s.sceneReady);
  const setPhase = useStore((s) => s.setPhase);
  const prog = useRef({ v: 0 });
  const flags = useRef({ minTime: false, scene: false, fonts: false, finished: false });

  const paint = () => {
    const v = prog.current.v;
    const el = root.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>(".loader-fill").forEach((f) => (f.style.clipPath = `inset(0 ${100 - v}% 0 0)`));
    el.querySelectorAll<HTMLElement>(".loader-count").forEach((c) => (c.textContent = String(Math.round(v)).padStart(3, "0")));
    el.querySelectorAll<HTMLElement>(".loader-bar").forEach((b) => (b.style.transform = `scaleX(${v / 100})`));
  };

  const { contextSafe } = useGSAP({ scope: root });

  const outro = contextSafe(() => {
    const reduced = useStore.getState().reducedMotion;
    const startIntro = () => {
      setPhase("reveal");
      gsap.to(motion, { intro: 1, duration: reduced ? 0.01 : 3, ease: "power3.out" });
    };
    if (reduced) {
      startIntro();
      gsap.to(root.current, { autoAlpha: 0, duration: 0.4, onComplete: () => setPhase("ready") });
      return;
    }
    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("ready");
        if (root.current) root.current.style.display = "none";
      },
    });
    tl.to(".loader-hud", { autoAlpha: 0, duration: 0.35, ease: "power2.out" })
      .to(".loader-word", { scale: 7.5, duration: 2.5, ease: "expo.in" }, 0.1)
      .addLabel("split", "-=0.5")
      .fromTo(".loader-seam", { scaleY: 0, autoAlpha: 1 }, { scaleY: 1, duration: 0.2, ease: "power4.out" }, "split")
      // glitch-shift: hard, stepped jolts
      .to(".loader-l", { x: -22, duration: 0.05, ease: "steps(1)" }, "split+=0.2")
      .to(".loader-r", { x: 26, y: 6, duration: 0.05, ease: "steps(1)" }, "<")
      .to(".loader-l", { x: 8, y: -4, duration: 0.05, ease: "steps(1)" })
      .to(".loader-r", { x: -10, y: 0, duration: 0.05, ease: "steps(1)" }, "<")
      .add(startIntro)
      .to(".loader-l", { xPercent: -102, duration: 1.2, ease: "expo.inOut" })
      .to(".loader-r", { xPercent: 102, duration: 1.2, ease: "expo.inOut" }, "<")
      .to(".loader-seam", { autoAlpha: 0, duration: 0.25 }, "<");
  });

  const maybeFinish = contextSafe(() => {
    const f = flags.current;
    if (f.finished || !f.minTime || !f.scene || !f.fonts) return;
    f.finished = true;
    gsap.to(prog.current, { v: 100, duration: 0.7, ease: "power2.inOut", overwrite: true, onUpdate: paint, onComplete: outro });
  });

  useGSAP(
    () => {
      document.fonts.ready.then(() => {
        flags.current.fonts = true;
        maybeFinish();
      });
      gsap.to(prog.current, {
        v: 86,
        duration: 2.4,
        ease: "power2.out",
        onUpdate: paint,
        onComplete: () => {
          flags.current.minTime = true;
          maybeFinish();
        },
      });
      // failsafe: never trap the user behind the loader (e.g. WebGL unavailable)
      gsap.delayedCall(9, () => {
        flags.current.scene = true;
        flags.current.minTime = true;
        flags.current.fonts = true;
        maybeFinish();
      });
    },
    { scope: root },
  );

  useEffect(() => {
    if (sceneReady) {
      flags.current.scene = true;
      maybeFinish();
    }
  }, [sceneReady, maybeFinish]);

  const half = (side: "l" | "r") => (
    <div
      className={`loader-${side} absolute inset-0 overflow-hidden bg-void`}
      style={{ clipPath: side === "l" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)" }}
      aria-hidden={side === "r"}
    >
      {/* faint slate glow so the void isn't flat */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,#2f4f4f_0%,transparent_65%)] opacity-60" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="loader-word relative font-poster text-mega leading-none will-change-transform">
          <span className="text-outline text-beige/40">{BRAND.name}</span>
          <span className="loader-fill absolute inset-0 text-beige" style={{ clipPath: "inset(0 100% 0 0)" }}>
            {BRAND.name}
          </span>
        </div>
      </div>
      <div className="loader-hud absolute inset-0 text-signal">
        <div className="absolute left-[4vw] top-[5vh] font-label">
          SYS//BOOT <span className="text-beige">{BRAND.tagline}</span>
        </div>
        <div className="absolute right-[4vw] top-[5vh] font-label">BUILD 0.1 · NEURAL MESH</div>
        <div className="absolute bottom-[6vh] left-[4vw] right-[4vw] flex items-end justify-between gap-6">
          <div className="font-label">
            INITIALISING AGENTS
            <div className="mt-2 h-px w-[min(40vw,420px)] bg-signal/25">
              <div className="loader-bar h-px origin-left bg-beige" style={{ transform: "scaleX(0)" }} />
            </div>
          </div>
          <div className="font-mono text-h2 tabular-nums text-beige">
            <span className="loader-count">000</span>
            <span className="text-signal">%</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={root} className="fixed inset-0 z-[100]" role="status" aria-label={`Loading ${BRAND.name}`}>
      {half("l")}
      {half("r")}
      <div className="loader-seam pointer-events-none absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-beige opacity-0 shadow-[0_0_24px_#f5f5dc]" />
    </div>
  );
}
