"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const INTERACTIVE = "a, button, summary, [data-cursor]";
const TEXT = "input, textarea, [contenteditable]";
const PAD = 8; // viewfinder breathing room around a target
const IDLE = 38; // viewfinder size when it is not locked onto anything

/**
 * Sleek HUD cursor. Two quiet layers:
 *  - dot   : a 10px beige block (a pixel of the logo). It is glued to the pointer (moves in
 *            the same frame, no easing), so it feels exactly like a normal cursor.
 *            mix-blend-difference keeps it visible on beige and slate alike.
 *  - frame : four bold corner ticks, a camera viewfinder (also blend-difference, so it shows
 *            on any background). It is glued around the dot too, and only animates when it
 *            boxes a link or button (the dot steps aside) or lets go of one. On press it tightens.
 * Nothing on the page moves toward the pointer. Text fields get the native I-beam back.
 *
 * One cursor for every input. The mode is decided by each pointer event (pointerType), never
 * by a one-time media query, so phones, Chrome DevTools phone mode and touchscreen laptops
 * all get it:
 *  - mouse / pen : the full cursor (system pointer hidden).
 *  - finger      : the same dot + viewfinder appear where you touch, box the tapped button,
 *                  then fade. The system pointer is never hidden on touch.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const root = document.documentElement;
    // a real mouse is likely: hide the system pointer straight away (confirmed by the first move)
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) root.classList.add("has-cursor");

    const d = dot.current!;
    const f = frame.current!;
    const to = (el: Element, prop: string, duration: number) => gsap.quickTo(el, prop, { duration, ease: "expo.out" });
    const fx = to(f, "x", 0.3), fy = to(f, "y", 0.3), fw = to(f, "width", 0.3), fh = to(f, "height", 0.3);

    const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
    let target: HTMLElement | null = null;
    let typing = false;
    let shown = false;
    let releasing = 0; // after letting go of a target, ease back for a moment, then glue to the pointer
    let touch = false; // was the last input a finger?
    let fade: ReturnType<typeof setTimeout> | undefined;
    const isTouch = (e: PointerEvent) => e.pointerType === "touch";
    const useMouse = () => {
      clearTimeout(fade);
      if (touch) { touch = false; shown = false; }
      root.classList.add("has-cursor");
    };
    gsap.set([d, f], { autoAlpha: 0 });
    gsap.set(d, { x: pointer.x, y: pointer.y });
    gsap.set(f, { x: pointer.x - IDLE / 2, y: pointer.y - IDLE / 2, width: IDLE, height: IDLE });

    const state = () => {
      gsap.to(d, { scale: target ? 0 : 1, autoAlpha: typing ? 0 : 1, duration: 0.25, ease: "expo.out", overwrite: "auto" });
      gsap.to(f, { autoAlpha: typing ? 0 : 1, duration: 0.25, overwrite: "auto" });
    };

    const onMove = (e: PointerEvent) => {
      if (isTouch(e)) {
        // finger dragging: the cursor follows it until it lifts
        pointer.x = e.clientX; pointer.y = e.clientY;
        gsap.set(d, { x: pointer.x, y: pointer.y });
        if (!target) glue();
        return;
      }
      useMouse();
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!shown) {
        shown = true;
        gsap.set(d, { x: pointer.x, y: pointer.y });
        gsap.set(f, { x: pointer.x - IDLE / 2, y: pointer.y - IDLE / 2 });
        state();
      }
      gsap.set(d, { x: pointer.x, y: pointer.y });
      if (!target && performance.now() > releasing) glue();
    };

    // idle: the frame sits around the pointer exactly, like part of the cursor
    const glue = () => {
      // (start = end: jump there this frame, but keep the quickTo tweens alive for the next lock-on)
      const x = pointer.x - IDLE / 2, y = pointer.y - IDLE / 2;
      fx(x, x); fy(y, y); fw(IDLE, IDLE); fh(IDLE, IDLE);
    };

    const onOver = (e: PointerEvent) => {
      if (isTouch(e)) return; // touches are handled on pointerdown
      const el = e.target as Element;
      // an embedded page (the Google booking calendar) has its own pointer: step aside until
      // the pointer comes back out, so no frozen dot is left at the frame's edge
      if (el.tagName === "IFRAME") {
        target = null;
        shown = false;
        gsap.to([d, f], { autoAlpha: 0, duration: 0.15, overwrite: "auto" });
        return;
      }
      const next = el.closest<HTMLElement>(INTERACTIVE);
      const nowTyping = !!el.closest(TEXT);
      if (next === target && nowTyping === typing) return;
      if (target && !next) releasing = performance.now() + 220;
      target = next;
      typing = nowTyping;
      state();
    };

    const tick = () => {
      if (target) {
        const r = target.getBoundingClientRect();
        fx(r.left - PAD); fy(r.top - PAD); fw(r.width + PAD * 2); fh(r.height + PAD * 2);
      } else if (performance.now() < releasing) {
        fx(pointer.x - IDLE / 2); fy(pointer.y - IDLE / 2); fw(IDLE); fh(IDLE);
      } else glue();
    };

    const hide = (e: PointerEvent) => {
      if (isTouch(e)) return; // a lifted finger fades on its own schedule
      shown = false;
      gsap.to([d, f], { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
    };

    // finger down: show the cursor at the touch, and box the button under it
    const touchDown = (e: PointerEvent) => {
      clearTimeout(fade);
      touch = true;
      root.classList.remove("has-cursor");
      pointer.x = e.clientX; pointer.y = e.clientY;
      const el = e.target as Element;
      target = el.closest<HTMLElement>(INTERACTIVE);
      typing = !!el.closest(TEXT);
      gsap.set(d, { x: pointer.x, y: pointer.y });
      glue(); // corners start at the finger, then (if on a button) expand around it
      gsap.to(d, { scale: target ? 0 : 1, autoAlpha: typing ? 0 : 1, duration: 0.15, overwrite: "auto" });
      gsap.to(f, { autoAlpha: typing ? 0 : 1, duration: 0.15, overwrite: "auto" });
    };
    // finger up: linger a moment so the tap reads, then fade out
    const touchUp = () => {
      clearTimeout(fade);
      fade = setTimeout(() => {
        gsap.to([d, f], { autoAlpha: 0, duration: 0.35, overwrite: "auto", onComplete: () => { target = null; } });
      }, 550);
    };

    const press = (e: PointerEvent) => {
      if (isTouch(e)) touchDown(e);
      else useMouse();
      gsap.to(f, { scale: 0.92, duration: 0.15, ease: "power2.out" });
    };
    const release = (e: PointerEvent) => {
      gsap.to(f, { scale: 1, duration: 0.35, ease: "expo.out" });
      if (isTouch(e)) touchUp();
    };

    addEventListener("pointermove", onMove);
    addEventListener("pointerover", onOver);
    addEventListener("pointerdown", press);
    addEventListener("pointerup", release);
    addEventListener("pointercancel", release); // e.g. the finger started scrolling
    root.addEventListener("pointerleave", hide);
    gsap.ticker.add(tick);

    return () => {
      clearTimeout(fade);
      root.classList.remove("has-cursor");
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerover", onOver);
      removeEventListener("pointerdown", press);
      removeEventListener("pointerup", release);
      removeEventListener("pointercancel", release);
      root.removeEventListener("pointerleave", hide);
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
