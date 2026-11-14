"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { lenisRef } from "@/lib/lenis";
import { motion } from "@/lib/motion";
import { useStore } from "@/lib/store";

/**
 * Lenis drives the scroll; GSAP's ticker drives Lenis (one RAF for everything);
 * ScrollTrigger reads Lenis. Also owns global pointer tracking → motion.pointer.
 */
export function SmoothScroll() {
  const phase = useStore((s) => s.phase);

  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    useStore.getState().setReducedMotion(reduced);

    const lenis = new Lenis({ lerp: reduced ? 1 : 0.075, wheelMultiplier: 0.85, autoRaf: false });
    lenisRef.current = lenis;
    lenis.stop();
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    const smooth = () => {
      motion.velocity += (lenis.velocity - motion.velocity) * 0.12;
      motion.pointerSpeed *= 0.88;
    };
    gsap.ticker.add(raf);
    gsap.ticker.add(smooth);
    gsap.ticker.lagSmoothing(0);

    let lx = -1, ly = -1;
    const onMove = (e: PointerEvent) => {
      const w = innerWidth, h = innerHeight;
      motion.pointer.x = (e.clientX / w) * 2 - 1;
      motion.pointer.y = -((e.clientY / h) * 2 - 1);
      motion.pointerUv.x = e.clientX / w;
      motion.pointerUv.y = 1 - e.clientY / h;
      if (lx >= 0) motion.pointerSpeed = Math.max(motion.pointerSpeed, Math.hypot(e.clientX - lx, e.clientY - ly));
      lx = e.clientX;
      ly = e.clientY;
      document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--my", `${e.clientY}px`);
    };
    addEventListener("pointermove", onMove, { passive: true });

    return () => {
      removeEventListener("pointermove", onMove);
      gsap.ticker.remove(raf);
      gsap.ticker.remove(smooth);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase !== "loading") {
      lenisRef.current?.start();
      ScrollTrigger.refresh();
    }
  }, [phase]);

  return null;
}
