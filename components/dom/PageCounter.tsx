"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { useStore } from "@/lib/store";

/**
 * PAGE COUNTER — [[001]], [[002]] …
 * Every [data-section] inside #page is a "page". When a new page crosses the
 * middle of the viewport, the counter slices shut, jumps to a NEW spot on the
 * screen, and slices back open with scrambled digits settling on the number.
 * Page 1 = top-left, page 2 = bottom-left, then it roams so consecutive pages
 * never share a position. Counting restarts on each route.
 */
type Pos = Partial<Record<"top" | "bottom" | "left" | "right", string>> & { center?: boolean; align?: "left" | "right" };
const POSITIONS: Pos[] = [
  { top: "13vh", left: "clamp(1.25rem,4.5vw,4rem)" },                       // 001 top-left
  { bottom: "11vh", left: "clamp(1.25rem,4.5vw,4rem)" },                    // 002 bottom-left
  { top: "13vh", right: "clamp(2.5rem,6vw,6rem)", align: "right" },         // 003 top-right
  { bottom: "11vh", right: "clamp(2.5rem,6vw,6rem)", align: "right" },      // 004 bottom-right
  { top: "13vh", left: "50%", center: true },                               // 005 top-centre
  { top: "30vh", right: "clamp(2.5rem,6vw,6rem)", align: "right" },         // 006 upper-right
  { bottom: "11vh", left: "50%", center: true },                            // 007 bottom-centre
  { top: "30vh", left: "clamp(1.25rem,4.5vw,4rem)" },                       // 008 upper-left
];

const pad = (n: number) => String(n).padStart(3, "0");

export function PageCounter() {
  const root = useRef<HTMLDivElement>(null);
  const digits = useRef<HTMLSpanElement>(null);
  const current = useRef(-1);
  const pathname = usePathname();
  const phase = useStore((s) => s.phase);

  const place = (i: number) => {
    const el = root.current!;
    const p = POSITIONS[i % POSITIONS.length];
    el.style.top = p.top ?? "auto";
    el.style.bottom = p.bottom ?? "auto";
    el.style.left = p.left ?? "auto";
    el.style.right = p.right ?? "auto";
    el.style.translate = p.center ? "-50% 0" : "0 0";
    el.style.textAlign = p.center ? "center" : p.align ?? "left";
  };

  const show = (i: number) => {
    if (i === current.current || !root.current) return;
    const first = current.current < 0;
    current.current = i;
    const final = pad(i + 1);
    const scramble = { t: 0 };
    gsap.killTweensOf(root.current, "clipPath"); // only our own slice — never the intro fade (autoAlpha)
    gsap
      .timeline()
      .to(root.current, { clipPath: "inset(50% 0% 50% 0%)", duration: first ? 0 : 0.28, ease: "expo.in" })
      .add(() => place(i))
      .to(scramble, {
        t: 1,
        duration: 0.5,
        ease: "none",
        onUpdate: () => {
          if (!digits.current) return;
          const settled = Math.floor(scramble.t * 4); // digits lock in left → right
          digits.current.textContent = final
            .split("")
            .map((d, k) => (k < settled || scramble.t === 1 ? d : String(Math.floor(Math.random() * 10))))
            .join("");
        },
      })
      .to(root.current, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "expo.out" }, "<");
  };

  useEffect(() => {
    if (phase === "loading") return;
    current.current = -1;
    let sections: HTMLElement[] = [];
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) show(sections.indexOf(en.target as HTMLElement));
        }),
      { rootMargin: "-48% 0px -48% 0px" },
    );
    const raf = requestAnimationFrame(() => {
      sections = Array.from(document.querySelectorAll<HTMLElement>("#page [data-section]"));
      sections.forEach((s) => io.observe(s));
      if (scrollY < 10) show(0);
    });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, phase]);

  return (
    <div
      ref={root}
      data-chrome
      aria-hidden
      className="pointer-events-none fixed z-50 select-none"
      style={{ clipPath: "inset(50% 0% 50% 0%)", top: "13vh", left: "4.5vw" }}
    >
      <div className="chamfer inline-block bg-void/85 px-3 pb-2 pt-1.5 backdrop-blur-sm">
      <div className="font-label text-signal">Page</div>
      <div className="font-poster text-[length:clamp(1.75rem,3.4vw,3.5rem)] leading-none tabular-nums">
        <span className="text-signal">[[</span>
        <span ref={digits} className="text-beige">
          001
        </span>
        <span className="text-signal">]]</span>
      </div>
      </div>
    </div>
  );
}
