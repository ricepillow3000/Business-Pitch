"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const INTERACTIVE = "a, button, summary, [data-cursor]";
const TEXT = "input, textarea, [contenteditable]";
const PAD = 8; // viewfinder breathing room around a target
const IDLE = 38; // viewfinder size when it is not locked onto anything

/**
 * Sleek HUD cursor. Two quiet layers:
 *  - dot   : a 10px beige block (a pixel of the logo). It sits exactly on the pointer, with
 *            no lag, no stretch and no rotation, so it never feels like it is fighting you.
 *            mix-blend-difference keeps it visible on beige and slate alike.
 *  - frame : four bold corner ticks, a camera viewfinder (also blend-difference, so it shows
 *            on any background). It hovers loosely around the dot,
 *            then snaps around a link or button (the dot steps aside). On press it tightens.
 * Text fields get the native I-beam back. Elements with [data-magnetic] lean toward the pointer.
 * Mouse / trackpad only: touch devices keep the native behaviour.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.documentElement.classList.add("has-cursor");

    const d = dot.current!;
    const f = frame.current!;
    const to = (el: Element, prop: string, duration: number) => gsap.quickTo(el, prop, { duration, ease: "expo.out" });
    const dx = to(d, "x", 0.08), dy = to(d, "y", 0.08);
    const fx = to(f, "x", 0.35), fy = to(f, "y", 0.35), fw = to(f, "width", 0.35), fh = to(f, "height", 0.35);

    const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
    let target: HTMLElement | null = null;
    let typing = false;
    let shown = false;
    gsap.set([d, f], { autoAlpha: 0 });
    gsap.set(d, { x: pointer.x, y: pointer.y });
    gsap.set(f, { x: pointer.x - IDLE / 2, y: pointer.y - IDLE / 2, width: IDLE, height: IDLE });

    const magnet = (el: HTMLElement, x: number, y: number, release = false) =>
      gsap.to(el, release
        ? { x: 0, y: 0, duration: 0.8, ease: "expo.out", overwrite: "auto" }
        : { x, y, duration: 0.5, ease: "expo.out", overwrite: "auto" });

    const state = () => {
      gsap.to(d, { scale: target ? 0 : 1, autoAlpha: typing ? 0 : 1, duration: 0.25, ease: "expo.out", overwrite: "auto" });
      gsap.to(f, { autoAlpha: typing ? 0 : 1, duration: 0.25, overwrite: "auto" });
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!shown) {
        shown = true;
        gsap.set(d, { x: pointer.x, y: pointer.y });
        gsap.set(f, { x: pointer.x - IDLE / 2, y: pointer.y - IDLE / 2 });
        state();
      }
      dx(pointer.x);
      dy(pointer.y);

      if (target?.hasAttribute("data-magnetic")) {
        const r = target.getBoundingClientRect();
        const cx = r.left + r.width / 2 - (gsap.getProperty(target, "x") as number);
        const cy = r.top + r.height / 2 - (gsap.getProperty(target, "y") as number);
        magnet(target, (pointer.x - cx) * 0.2, (pointer.y - cy) * 0.3);
      }
    };

    const onOver = (e: PointerEvent) => {
      const el = e.target as Element;
      const next = el.closest<HTMLElement>(INTERACTIVE);
      const nowTyping = !!el.closest(TEXT);
      if (next === target && nowTyping === typing) return;
      if (target !== next && target?.hasAttribute("data-magnetic")) magnet(target, 0, 0, true);
      target = next;
      typing = nowTyping;
      state();
    };

    const tick = () => {
      if (target) {
        const r = target.getBoundingClientRect();
        fx(r.left - PAD); fy(r.top - PAD); fw(r.width + PAD * 2); fh(r.height + PAD * 2);
      } else {
        fx(pointer.x - IDLE / 2); fy(pointer.y - IDLE / 2); fw(IDLE); fh(IDLE);
      }
    };

    const hide = () => { shown = false; gsap.to([d, f], { autoAlpha: 0, duration: 0.2, overwrite: "auto" }); };
    const press = () => gsap.to(f, { scale: 0.92, duration: 0.15, ease: "power2.out" });
    const release = () => gsap.to(f, { scale: 1, duration: 0.35, ease: "expo.out" });

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

  const tick = "absolute h-3 w-3 border-current";
  return (
    <>
      {/* blend mode must sit on a top-level fixed element: a wrapper would isolate it */}
      <div ref={dot} data-cursor-dot aria-hidden className="pointer-events-none invisible fixed top-0 left-0 z-[200] -mt-[5px] -ml-[5px] h-2.5 w-2.5 bg-beige mix-blend-difference" />
      <div ref={frame} data-cursor-frame aria-hidden className="pointer-events-none invisible fixed top-0 left-0 z-[199] text-beige mix-blend-difference">
        <span className={`${tick} top-0 left-0 border-t-2 border-l-2`} />
        <span className={`${tick} top-0 right-0 border-t-2 border-r-2`} />
        <span className={`${tick} bottom-0 left-0 border-b-2 border-l-2`} />
        <span className={`${tick} right-0 bottom-0 border-r-2 border-b-2`} />
      </div>
    </>
  );
}
