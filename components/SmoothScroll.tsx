"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { onReveal } from "@/lib/intro";
import { smooth } from "@/lib/lenis";

/**
 * Lenis momentum scroll, driven by GSAP's ticker so Lenis, GSAP and
 * ScrollTrigger share ONE requestAnimationFrame. `anchors: true` turns every
 * <a href="#id"> into a smooth in-page jump: no router, no reloads.
 */
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: true, autoRaf: false });
    smooth.lenis = lenis;
    lenis.stop(); // locked while the loader plays

    const raf = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const off = onReveal(() => {
      lenis.start();
      // arriving from another page with a #section (e.g. /#initiation): glide to it
      const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (!target) return;
      // Let Lenis measure the page first (when the intro is skipped this runs instantly), and
      // aim again once fonts and images have settled, unless the visitor has started scrolling.
      let userMoved = false;
      const moved = () => (userMoved = true);
      addEventListener("wheel", moved, { once: true, passive: true });
      addEventListener("touchstart", moved, { once: true, passive: true });
      addEventListener("keydown", moved, { once: true });
      const go = (duration: number) => {
        if (userMoved) return;
        lenis.resize();
        lenis.scrollTo(target, { duration, force: true });
      };
      requestAnimationFrame(() => go(1.4));
      document.fonts.ready.then(() => go(1.4));
      if (document.readyState === "complete") setTimeout(() => go(0.8), 600);
      else addEventListener("load", () => setTimeout(() => go(0.8), 300), { once: true });
    });
    document.fonts.ready.then(() => ScrollTrigger.refresh());

    return () => {
      off();
      gsap.ticker.remove(raf);
      lenis.destroy();
      smooth.lenis = null;
    };
  }, []);

  return null;
}
