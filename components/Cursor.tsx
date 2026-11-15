"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const INTERACTIVE = "a, button, [data-cursor]";
const PAD = 10; // bracket breathing room around a target

/**
 * Two layers, one ticker:
 *  - node     : a beige dot with mix-blend-difference (inverts whatever it crosses).
 *               It trails the pointer and stretches along its velocity like a drop of fluid.
 *  - brackets : Flag Blue [ ] that live at the pointer, invisible. Over a link or button
 *               the node collapses and the brackets expand to lock onto the target's box.
 * Elements with [data-magnetic] are pulled toward the pointer while hovered.
 * Mouse / trackpad only: touch devices keep the native behaviour.
 */
export function Cursor() {
  const node = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.documentElement.classList.add("has-cursor");

    const n = node.current!;
    const f = frame.current!;
    const to = (el: Element, prop: string, duration: number) => gsap.quickTo(el, prop, { duration, ease: "expo.out" });
    const nx = to(n, "x", 0.5), ny = to(n, "y", 0.5);
    const fx = to(f, "x", 0.6), fy = to(f, "y", 0.6), fw = to(f, "width", 0.6), fh = to(f, "height", 0.6);

    const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
    let target: HTMLElement | null = null;
    let lastX = pointer.x, lastY = pointer.y, speed = 0;
    gsap.set(n, { x: pointer.x, y: pointer.y, autoAlpha: 0 });

    const magnet = (el: HTMLElement, x: number, y: number, release = false) =>
      gsap.to(el, release
        ? { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.35)", overwrite: "auto" }
        : { x, y, duration: 0.6, ease: "expo.out", overwrite: "auto" });

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      gsap.to(n, { autoAlpha: 1, duration: 0.3, overwrite: "auto" });
      nx(pointer.x);
      ny(pointer.y);

      if (target?.hasAttribute("data-magnetic")) {
        const r = target.getBoundingClientRect();
        const cx = r.left + r.width / 2 - (gsap.getProperty(target, "x") as number);
        const cy = r.top + r.height / 2 - (gsap.getProperty(target, "y") as number);
        magnet(target, (pointer.x - cx) * 0.3, (pointer.y - cy) * 0.4);
      }
    };

    const onOver = (e: PointerEvent) => {
      const next = (e.target as Element).closest<HTMLElement>(INTERACTIVE);
      if (next === target) return;
      if (target?.hasAttribute("data-magnetic")) magnet(target, 0, 0, true);
      target = next;
      gsap.to(dot.current, { scale: target ? 0 : 1, duration: 0.5, ease: "expo.out" });
      gsap.to(f, { autoAlpha: target ? 1 : 0, duration: target ? 0.25 : 0.4 });
    };

    const tick = () => {
      // fluid stretch: scale along the direction of travel, squeeze across it
      const dx = pointer.x - lastX, dy = pointer.y - lastY;
      speed += (Math.hypot(dx, dy) - speed) * 0.2;
      lastX = pointer.x;
      lastY = pointer.y;
      const s = Math.min(speed / 40, 0.8);
      if (s > 0.01) gsap.set(n, { rotation: (Math.atan2(dy, dx) * 180) / Math.PI });
      gsap.set(n, { scaleX: 1 + s, scaleY: 1 - s * 0.45 });

      // brackets: lock onto the target, or wait collapsed at the pointer
      if (target) {
        const r = target.getBoundingClientRect();
        fx(r.left - PAD); fy(r.top - PAD); fw(r.width + PAD * 2); fh(r.height + PAD * 2);
      } else {
        fx(pointer.x - 14); fy(pointer.y - 14); fw(28); fh(28);
      }
    };

    const hide = () => gsap.to([n, f], { autoAlpha: 0, duration: 0.3 });
    const press = () => gsap.to(dot.current, { scale: target ? 0 : 0.6, duration: 0.2 });
    const release = () => gsap.to(dot.current, { scale: target ? 0 : 1, duration: 0.5, ease: "elastic.out(1, 0.4)" });

    addEventListener("pointermove", onMove);
    addEventListener("pointerover", onOver);
    addEventListener("pointerdown", press);
    addEventListener("pointerup", release);
    document.documentElement.addEventListener("pointerleave", hide);
    gsap.ticker.add(tick);

    return () => {
      document.documentElement.classList.remove("has-cursor");
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerover", onOver);
      removeEventListener("pointerdown", press);
      removeEventListener("pointerup", release);
      document.documentElement.removeEventListener("pointerleave", hide);
      gsap.ticker.remove(tick);
    };
  });

  return (
    <>
      {/* blend mode must sit on a top-level fixed element: a wrapper would isolate it */}
      <div ref={node} aria-hidden className="pointer-events-none invisible fixed top-0 left-0 z-[200] -mt-2 -ml-2 h-4 w-4 mix-blend-difference">
        <div ref={dot} className="h-full w-full bg-beige" /> {/* square, like a block of the logo */}
      </div>
      <div ref={frame} aria-hidden className="pointer-events-none invisible fixed top-0 left-0 z-[199] text-flag">
        <span className="absolute inset-y-0 left-0 w-2 border-y border-l border-current" />
        <span className="absolute inset-y-0 right-0 w-2 border-y border-r border-current" />
      </div>
    </>
  );
}
