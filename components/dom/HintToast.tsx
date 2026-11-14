"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { motion } from "@/lib/motion";
import { range } from "@/lib/spring";
import { useStore } from "@/lib/store";

const KEY = "jido:hint-seen";
const readSeen = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const writeSeen = () => {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* private mode / blocked storage: just don't remember */
  }
};

/**
 * One-time hint after the intro: "Click the orb or the storm to explore".
 * Hides for good after the first interaction (remembered in localStorage);
 * fades away while the hero scrolls.
 */
export function HintToast() {
  const phase = useStore((s) => s.phase);
  const panel = useStore((s) => s.panel);
  const pathname = usePathname();
  const el = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [verb, setVerb] = useState("Click");

  useEffect(() => {
    if (phase !== "ready" || readSeen()) return;
    if (matchMedia("(pointer: coarse)").matches) setVerb("Tap");
    const t = setTimeout(() => setActive(true), 600);
    return () => clearTimeout(t);
  }, [phase]);

  // first interaction → gone for good
  useEffect(() => {
    if (panel) {
      writeSeen();
      setActive(false);
    }
  }, [panel]);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const home = pathname === "/";
    const tick = () => {
      node.style.opacity = active && home ? String(1 - range(motion.hero, 0.01, 0.06)) : "0";
    };
    gsap.ticker.add(tick);
    if (active && home) gsap.fromTo(node, { y: 16 }, { y: 0, duration: 1, ease: "expo.out" });
    return () => gsap.ticker.remove(tick);
  }, [active, pathname]);

  return (
    <div
      ref={el}
      aria-live="polite"
      data-hint
      data-active={active ? "1" : "0"}
      className="pointer-events-none fixed left-1/2 top-[15vh] z-[30] -translate-x-1/2 opacity-0"
    >
      {active && (
        <span className="flex items-center gap-2.5 whitespace-nowrap border border-beige/25 bg-void/60 px-3.5 py-2 font-label text-beige backdrop-blur-sm">
          <span className="hotspot-dot inline-block h-1.5 w-1.5 rounded-full bg-beige" />
          {verb} the orb or the storm to explore
        </span>
      )}
    </div>
  );
}
