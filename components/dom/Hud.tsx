"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { lenisRef } from "@/lib/lenis";
import { BRAND } from "@/lib/config";
import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/transition/TransitionLink";

/** Corner bracket */
const Bracket = ({ className }: { className: string }) => (
  <span className={`absolute h-5 w-5 border-signal/70 ${className}`} aria-hidden />
);

/**
 * Fixed HUD that frames the viewport like a game interface:
 * brackets, registration marks, live cursor coordinates, scroll %, section index, clock.
 */
export function Hud() {
  const root = useRef<HTMLDivElement>(null);
  const coords = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState("00 // Signal");
  const [clock, setClock] = useState("--:--:--");
  const pathname = usePathname();

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (coords.current) coords.current.textContent = `X ${String(Math.round(e.clientX)).padStart(4, "0")} · Y ${String(Math.round(e.clientY)).padStart(4, "0")}`;
    };
    const tick = () => {
      const p = lenisRef.current?.progress ?? 0;
      if (pct.current) pct.current.textContent = String(Math.round(p * 100)).padStart(3, "0");
      if (bar.current) bar.current.style.transform = `scaleY(${p})`;
    };
    const t = setInterval(() => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false })), 1000);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && setSection((en.target as HTMLElement).dataset.section!)),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    // wait a frame so the incoming route's sections exist
    const raf = requestAnimationFrame(() => document.querySelectorAll("[data-section]").forEach((s) => io.observe(s)));
    addEventListener("pointermove", onMove, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      clearInterval(t);
      cancelAnimationFrame(raf);
      io.disconnect();
      removeEventListener("pointermove", onMove);
      gsap.ticker.remove(tick);
    };
  }, [pathname]);

  return (
    <div ref={root} data-chrome className="pointer-events-none fixed inset-0 z-50 text-signal">
      {/* viewport frame */}
      <div className="absolute inset-3 md:inset-5">
        <Bracket className="left-0 top-0 border-l border-t" />
        <Bracket className="right-0 top-0 border-r border-t" />
        <Bracket className="bottom-0 left-0 border-b border-l" />
        <Bracket className="bottom-0 right-0 border-b border-r" />
      </div>

      {/* registration marks (the "+" field from the reference) */}
      {[
        [25, 30], [75, 30], [25, 70], [75, 70], [50, 50],
      ].map(([x, y]) => (
        <span key={`${x}-${y}`} className="absolute font-mono text-xs text-signal/35" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden>
          +
        </span>
      ))}

      {/* top bar */}
      <header className="pointer-events-auto absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-5 md:px-10 md:py-7">
        <TransitionLink href="/" className="flex items-baseline gap-3" data-magnetic aria-label={`${BRAND.name} home`}>
          <span className="font-poster text-xl leading-none text-beige md:text-2xl">{BRAND.name}</span>
          <span className="hidden font-label text-signal sm:inline">/ {BRAND.tagline}</span>
        </TransitionLink>
        <nav className="flex items-center gap-2">
          {(
            [
              ["/#agents", "Agents"],
              ["/pricing", "Pricing"],
              ["/#calculator", "Cost"],
            ] as const
          ).map(([href, label]) => (
            <TransitionLink
              key={href}
              href={href}
              data-magnetic
              className={`hidden px-3 py-2 font-label hover:text-beige md:inline-block ${pathname === href ? "text-beige" : "text-beige/70"}`}
            >
              {label}
            </TransitionLink>
          ))}
          <TransitionLink href="/booking" data-magnetic className="chamfer bg-beige px-4 py-2.5 font-label font-bold text-flag">
            Book audit →
          </TransitionLink>
        </nav>
      </header>

      {/* left rail */}
      <div className="absolute left-5 top-1/2 hidden -translate-y-1/2 -rotate-90 origin-left font-label md:left-9 md:block">
        <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-beige align-middle" />
        SYS//ONLINE · 05 UNITS ACTIVE
      </div>

      {/* right rail: scroll gauge */}
      <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 md:right-10 md:flex">
        <div className="h-32 w-px bg-signal/25">
          <div ref={bar} className="h-full w-px origin-top bg-beige" style={{ transform: "scaleY(0)" }} />
        </div>
        <span className="font-label tabular-nums">
          <span ref={pct}>000</span>
        </span>
      </div>

      {/* bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-6 py-5 font-label md:px-10 md:py-7">
        <span ref={coords} className="hidden tabular-nums md:inline">X 0000 · Y 0000</span>
        <span className="text-beige">[{section}]</span>
        <span className="tabular-nums">{clock} LOCAL</span>
      </div>
    </div>
  );
}
