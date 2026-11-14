"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { INFO } from "@/lib/config";
import { lenisRef } from "@/lib/lenis";
import { motion } from "@/lib/motion";
import { useStore, type PanelId } from "@/lib/store";
import { TransitionLink } from "@/components/transition/TransitionLink";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * INFO PANEL — Marathon-styled sheet that slices in from the right (clip-path).
 * Opened by clicking the orb / storm (3D) or their hotspot buttons (DOM).
 * Esc, ✕ or a click outside closes it. Focus is trapped while open, Lenis is stopped,
 * and the camera eases toward the clicked object (motion.focus).
 */
export function InfoPanel() {
  const panel = useStore((s) => s.panel);
  const closePanel = useStore((s) => s.closePanel);
  const [shown, setShown] = useState<PanelId | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  // open / close choreography
  useEffect(() => {
    if (panel) {
      lastFocus.current = document.activeElement as HTMLElement | null;
      motion.focusTarget = panel;
      motion.hover = "none";
      gsap.to(motion, { focus: 1, duration: 1.4, ease: "expo.out", overwrite: "auto" });
      lenisRef.current?.stop();
      document.documentElement.classList.add("panel-open");
      setShown(panel);
    } else if (sheet.current) {
      document.documentElement.classList.remove("panel-open");
      gsap.to(motion, { focus: 0, duration: 1.2, ease: "expo.inOut", overwrite: "auto" });
      gsap.to(veil.current, { autoAlpha: 0, duration: 0.4 });
      gsap.to(sheet.current, {
        clipPath: "inset(0% 0% 0% 100%)",
        duration: 0.55,
        ease: "expo.in",
        onComplete: () => {
          setShown(null);
          lenisRef.current?.start();
          lastFocus.current?.focus?.({ preventScroll: true });
        },
      });
    }
  }, [panel]);

  // slice in once mounted
  useLayoutEffect(() => {
    if (!shown || !sheet.current) return;
    gsap.fromTo(veil.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
    gsap.fromTo(sheet.current, { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.out" });
    gsap.from(sheet.current.querySelectorAll("[data-panel-line]"), { yPercent: 60, autoAlpha: 0, duration: 0.8, stagger: 0.05, delay: 0.15, ease: "expo.out" });
    sheet.current.querySelector<HTMLElement>("[data-panel-close]")?.focus({ preventScroll: true });
  }, [shown]);

  // Esc + focus trap
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
      } else if (e.key === "Tab" && sheet.current) {
        const els = [...sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && (document.activeElement === first || !sheet.current.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !sheet.current.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [panel, closePanel]);

  // navigating away (e.g. the CTA) closes it
  useEffect(() => {
    if (useStore.getState().panel) closePanel();
  }, [pathname, closePanel]);

  if (!shown) return null;
  const info = INFO[shown];
  return (
    <>
      <div ref={veil} data-panel-veil className="fixed inset-0 z-[60] bg-void/40" onPointerDown={closePanel} aria-hidden />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-panel-title"
        data-panel={shown}
        className="fixed bottom-0 right-0 top-0 z-[70] flex w-full flex-col overflow-y-auto border-l border-signal/30 bg-slate-deep/95 px-7 pb-10 pt-8 backdrop-blur-md sm:w-[min(520px,92vw)] md:px-10"
        style={{ clipPath: "inset(0% 0% 0% 100%)" }}
      >
        <div className="hazard h-2 w-full text-signal/40" aria-hidden />
        <div className="mt-6 flex items-center justify-between">
          <span className="font-label text-signal" data-panel-line>
            {info.code} {"//"} {info.hotspot}
          </span>
          <button
            type="button"
            data-panel-close
            data-magnetic
            onClick={closePanel}
            className="font-label text-beige/80 outline-none hover:text-beige focus-visible:text-beige focus-visible:underline"
            aria-label="Close panel"
          >
            ✕ Close <span className="text-signal">[Esc]</span>
          </button>
        </div>
        <h2 id="info-panel-title" className="mt-10 font-poster text-h2 text-beige" data-panel-line>
          {info.title}
        </h2>
        <p className="mt-6 font-body text-lead text-beige/85" data-panel-line>
          {info.body}
        </p>
        <ul className="mt-8 flex flex-col gap-3 border-t border-signal/20 pt-6">
          {info.bullets.map((b) => (
            <li key={b} className="flex gap-3 font-body text-beige/80" data-panel-line>
              <span className="font-label leading-6 text-signal">▸</span>
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-10" data-panel-line>
          <TransitionLink href="/booking" data-magnetic data-cursor-label="GO" className="chamfer inline-block bg-beige px-6 py-4 font-label font-bold text-flag">
            Book an audit →
          </TransitionLink>
        </div>
      </div>
    </>
  );
}
