"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { motion } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { BRAND } from "@/lib/config";
import { INTRO } from "@/lib/intro";

/**
 * LOADER SEQUENCE
 *  1. Brand name = progress bar. Outline text, beige fill clipped left→right by progress.
 *  2. Tabular digits hit 100% → the word rushes at the viewer (scale ≈ 5.5, expo.in),
 *     as if reaching through the screen.
 *  3. A seam flashes down the middle, two stepped glitch-jolts, then the two halves
 *     (each a clip-path'd copy of the whole loader) part like a curtain.
 *  4. Same frame: motion.reveal 0 → 1 (orb ignites, beam strikes, dust blasts outward,
 *     the storm spins up, the camera settles) with the SAME position, duration and
 *     ease as the website's fade-in.
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

  /**
   * MASTER INTRO TIMELINE — the one place the DOM, the curtain and WebGL are synced.
   * GSAP owns the clock; R3F only reads motion.* every frame (canvas/moon/*).
   */
  const outro = contextSafe(() => {
    const reduced = useStore.getState().reducedMotion;
    // Real elements, not selector strings: useGSAP's `scope` would resolve strings inside the loader only.
    const UI = [document.getElementById("page"), ...document.querySelectorAll<HTMLElement>("[data-chrome]")];

    if (reduced) {
      setPhase("reveal");
      motion.reveal = 1; // static reveal: no rush, no curtain, simulations settle then hold
      gsap.to(root.current, { autoAlpha: 0, duration: 0.4, onComplete: () => setPhase("ready") });
      return;
    }

    const { RUSH_SCALE, REVEAL_AT, REVEAL_DUR, REVEAL_EASE } = INTRO;
    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("ready");
        if (root.current) root.current.style.display = "none";
      },
    });

    tl.set(UI, { autoAlpha: 0 }) // website hidden behind the curtain
      // ① 100% → the name rushes at the viewer, as if reaching through the screen
      .to(".loader-hud", { autoAlpha: 0, duration: 0.3, ease: "power2.out" })
      .to(".loader-word", { scale: RUSH_SCALE, duration: 1.0, ease: "expo.in" }, 0.05)
      // ② seam + stepped glitch
      .addLabel("curtain", 0.85)
      .fromTo(".loader-seam", { scaleY: 0, autoAlpha: 1 }, { scaleY: 1, duration: 0.2, ease: "power4.out" }, "curtain")
      .to(".loader-l", { x: -22, duration: 0.05, ease: "steps(1)" }, "curtain+=0.18")
      .to(".loader-r", { x: 26, y: 6, duration: 0.05, ease: "steps(1)" }, "<")
      .to(".loader-l", { x: 8, y: -4, duration: 0.05, ease: "steps(1)" })
      .to(".loader-r", { x: -10, y: 0, duration: 0.05, ease: "steps(1)" }, "<")
      // ③ OPEN: the curtain parts …
      .addLabel("open", "curtain+=0.32")
      .add(() => setPhase("reveal"), "open")
      .to(".loader-l", { xPercent: -102, duration: 1.3, ease: "expo.inOut" }, "open")
      .to(".loader-r", { xPercent: 102, duration: 1.3, ease: "expo.inOut" }, "open")
      .to(".loader-seam", { autoAlpha: 0, duration: 0.3 }, "open+=0.5")
      // ④ … and the scene reveal + the website fade share ONE window and ONE ease
      .fromTo(motion, { reveal: 0 }, { reveal: 1, duration: REVEAL_DUR, ease: REVEAL_EASE }, `open+=${REVEAL_AT}`)
      .to(UI, { autoAlpha: 1, duration: REVEAL_DUR, ease: REVEAL_EASE }, `open+=${REVEAL_AT}`);
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,#2b3237_0%,transparent_65%)] opacity-60" />
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
        <div className="absolute right-[4vw] top-[5vh] font-label">BUILD 0.2 · ORBITAL LINK</div>
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
