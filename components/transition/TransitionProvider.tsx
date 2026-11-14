"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { lenisRef } from "@/lib/lenis";
import { motion } from "@/lib/motion";
import { PREFETCH_ROUTES, stageFor } from "@/lib/routes";
import { useStore } from "@/lib/store";
import { INTRO } from "@/lib/intro";

/**
 * THE LUSION TRANSITION METHOD
 *
 *  click ─┬─► camera/brain choreography starts IMMEDIATELY (WebGL never waits)
 *         └─► outgoing DOM slices shut to a beige seam (0.7s)
 *                 └─► router.push (route already prefetched → no network wait)
 *                         └─► pathname commits → scroll reset under the seam
 *                                 └─► incoming DOM slices open + [data-enter] lines stagger in,
 *                                     landing as the camera settles (~1.8s total)
 *
 * The <Canvas> lives in the root layout, outside this page swap, so the WebGL
 * context, geometry and compiled shaders persist for the whole session.
 * Back/forward (popstate) skips the outro but still gets choreography + entrance.
 */

type Ctx = { navigate: (href: string) => void; prefetch: (href: string) => void };
const TransitionCtx = createContext<Ctx>({ navigate: () => {}, prefetch: () => {} });
export const useTransitionRouter = () => useContext(TransitionCtx);

const norm = (p: string) => p.replace(/\/$/, "") || "/";
const DURATION = 1.8;

/** Tween the 3D stage to the route's pose. Shared by link clicks and popstate. */
function choreograph(path: string) {
  const isHome = norm(path) === "/";
  gsap.to(motion.stage, { ...stageFor(path), duration: DURATION, ease: "expo.inOut", overwrite: true });
  gsap.to(motion, { homeWeight: isHome ? 1 : 0, duration: DURATION, ease: "expo.inOut", overwrite: "auto" });
}

/** Incoming typography: every [data-enter] in the page rises out of a line mask. */
function enterText(page: HTMLElement, delay = 0) {
  const els = page.querySelectorAll<HTMLElement>("[data-enter]");
  els.forEach((el, i) => {
    const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "split-line" });
    gsap.from(split.lines, {
      yPercent: 115,
      duration: 1.2,
      delay: delay + i * 0.06,
      stagger: 0.07,
      ease: "expo.out",
      onComplete: () => split.revert(),
    });
  });
  const fades = page.querySelectorAll("[data-enter-fade]");
  if (fades.length) gsap.from(fades, { autoAlpha: 0, y: 24, duration: 1, delay: delay + 0.35, stagger: 0.05, ease: "expo.out" });
}

export function TransitionProvider({ children, chrome }: { children: React.ReactNode; chrome?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const phase = useStore((s) => s.phase);
  const page = useRef<HTMLDivElement>(null);
  const seam = useRef<HTMLDivElement>(null);
  const seamLabel = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);
  const choreographed = useRef<string | null>(null);
  const pendingHash = useRef<string>("");
  const firstPath = useRef(true);

  const prefetch = useCallback((href: string) => router.prefetch(href.split("#")[0] || "/"), [router]);

  const navigate = useCallback(
    (href: string) => {
      const url = new URL(href, location.href);
      const target = norm(url.pathname);
      if (target === norm(pathname)) {
        if (url.hash) lenisRef.current?.scrollTo(url.hash, { duration: 1.6 });
        return;
      }
      if (busy.current || !page.current) return;
      busy.current = true;
      pendingHash.current = url.hash;
      prefetch(target);

      // 1. 3D starts moving on the click frame
      choreographed.current = target;
      choreograph(target);

      // 2. outgoing DOM slices shut onto a seam
      if (seamLabel.current) seamLabel.current.textContent = `ROUTING ▸ ${target === "/" ? "/HOME" : target.toUpperCase()}`;
      lenisRef.current?.stop();
      gsap
        .timeline({ onComplete: () => router.push(target, { scroll: false }) })
        .to(page.current, { clipPath: "inset(50% 0% 50% 0%)", duration: 0.7, ease: "expo.in" })
        .fromTo(seam.current, { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.45, ease: "expo.out" }, 0.3)
        // stepped glitch on the seam (clip jitters, never transforms — keeps pinned/fixed children intact)
        .to(seam.current, { y: -3, duration: 0.04, ease: "steps(1)" })
        .to(seam.current, { y: 2, duration: 0.04, ease: "steps(1)" });
    },
    [pathname, prefetch, router],
  );

  // Route committed (link click OR back/forward)
  useEffect(() => {
    const path = norm(pathname);
    if (firstPath.current) {
      // first load: snap the stage, the preloader handles the reveal
      firstPath.current = false;
      gsap.set(motion.stage, stageFor(path));
      motion.homeWeight = path === "/" ? 1 : 0;
      return;
    }
    if (choreographed.current !== path) choreograph(path); // popstate
    choreographed.current = null;
    motion.hero = 0;
    motion.cta = 0;

    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    lenisRef.current?.start();
    requestAnimationFrame(() => ScrollTrigger.refresh());

    const el = page.current!;
    gsap
      .timeline({
        onComplete: () => {
          busy.current = false;
          if (pendingHash.current) lenisRef.current?.scrollTo(pendingHash.current, { duration: 1.6 });
          pendingHash.current = "";
        },
      })
      .fromTo(el, { clipPath: "inset(50% 0% 50% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "expo.out", delay: 0.05, clearProps: "clipPath" })
      .to(seam.current, { autoAlpha: 0, duration: 0.4 }, 0.1);
    enterText(el, 0.15);
  }, [pathname]);

  // Direct load of a non-home route: run the entrance once the loader opens
  useEffect(() => {
    if (phase === "reveal" && norm(pathname) !== "/" && page.current) enterText(page.current, INTRO.SPLIT_AT + 0.1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Pre-load: once the loader is done, warm every next-logical route + heavy chunks on idle
  useEffect(() => {
    if (phase !== "ready") return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300));
    idle(() => {
      PREFETCH_ROUTES.forEach((r) => router.prefetch(r));
      import("@/components/booking/BookingForm"); // JS chunk in cache before anyone clicks
    });
  }, [phase, router]);

  return (
    <TransitionCtx.Provider value={{ navigate, prefetch }}>
      <div ref={page} id="page" className="relative z-10">
        {children}
      </div>
      {chrome}
      <div
        ref={seam}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 right-0 top-1/2 z-[90] h-[2px] origin-center bg-beige opacity-0 shadow-[0_0_24px_#f5f5dc]"
      >
        <span ref={seamLabel} className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap font-label text-beige" />
      </div>
    </TransitionCtx.Provider>
  );
}
