"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { Spring } from "@/lib/spring";
import { motion } from "@/lib/motion";

/**
 * Physics cursor:
 *  - dot: exact pointer
 *  - ring: under-damped spring, stretches along its velocity (fluid blob)
 *  - magnetic: on [data-magnetic] the ring morphs to the element and pulls it toward the pointer
 *  - light: a soft beige radial "light source" over the DOM
 * The WebGL half of the lens lives in canvas/LensEffect.tsx.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    document.documentElement.classList.add("has-cursor");

    const sx = new Spring(innerWidth / 2, 220, 20);
    const sy = new Spring(innerHeight / 2, 220, 20);
    const sw = new Spring(34, 260, 24);
    const sh = new Spring(34, 260, 24);
    const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    let magnet: HTMLElement | null = null;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!visible) {
        visible = true;
        gsap.to([dot.current, ring.current], { autoAlpha: 1, duration: 0.3 });
      }
    };
    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-magnetic], a, button, summary, input");
      if (el === magnet) return;
      if (magnet) gsap.to(magnet, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
      magnet = el;
      motion.hoverBoost = el ? 1 : 0;
      if (label.current) label.current.textContent = el?.dataset.cursorLabel ?? "";
    };
    const onLeave = () => {
      visible = false;
      gsap.to([dot.current, ring.current], { autoAlpha: 0, duration: 0.3 });
    };

    const tick = (_: number, deltaMs: number) => {
      const dt = Math.min(deltaMs / 1000, 1 / 20);
      let tx = mouse.x, ty = mouse.y, tw = 34, th = 34;
      const isMag = magnet && magnet.hasAttribute("data-magnetic");
      if (magnet && isMag) {
        const r = magnet.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        tx = cx + (mouse.x - cx) * 0.12;
        ty = cy + (mouse.y - cy) * 0.12;
        tw = r.width + 14;
        th = r.height + 14;
        gsap.set(magnet, { x: (mouse.x - cx) * 0.22, y: (mouse.y - cy) * 0.3 });
      } else if (magnet) {
        tw = th = 64;
      }
      const x = sx.step(tx, dt), y = sy.step(ty, dt);
      const w = sw.step(tw, dt), h = sh.step(th, dt);
      const speed = Math.hypot(sx.v, sy.v);
      const stretch = isMag ? 0 : Math.min(speed / 2600, 0.55);
      const angle = Math.atan2(sy.v, sx.v);
      if (ring.current) {
        ring.current.style.width = `${w}px`;
        ring.current.style.height = `${h}px`;
        ring.current.style.borderRadius = isMag ? "2px" : "999px";
        ring.current.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0) rotate(${isMag ? 0 : angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.5})`;
      }
      if (dot.current) dot.current.style.transform = `translate3d(${mouse.x - 3}px, ${mouse.y - 3}px, 0)`;
    };

    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    gsap.ticker.add(tick);
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gsap.ticker.remove(tick);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <>
      {/* DOM light source */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[5] mix-blend-screen"
        style={{ background: "radial-gradient(520px circle at var(--mx, 50%) var(--my, 50%), rgba(245,245,220,0.07), transparent 60%)" }}
      />
      <div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[200] mix-blend-difference">
        <div
          ref={ring}
          className="invisible absolute left-0 top-0 grid place-items-center border border-beige opacity-0"
          style={{ width: 34, height: 34, borderRadius: 999 }}
        >
          <span ref={label} className="font-label text-[9px] text-beige" />
        </div>
        <div ref={dot} className="invisible absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-beige opacity-0" />
      </div>
    </>
  );
}
