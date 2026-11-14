"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { AGENTS } from "@/lib/config";
import { Label } from "./Label";

/** Fake-but-decorative barcode, deterministic per code */
function Barcode({ code }: { code: string }) {
  const bars = Array.from({ length: 28 }, (_, i) => ((code.charCodeAt(i % code.length) * (i + 3)) % 4) + 1);
  return (
    <div className="flex h-7 items-stretch gap-[2px]" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} className="bg-current" style={{ width: w }} />
      ))}
    </div>
  );
}

/** 02 — Agent units as spec cards on a pinned horizontal track (vertical stack on mobile). */
export function Agents() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const dist = () => track.current!.scrollWidth - innerWidth;
        gsap.to(track.current, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${dist()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="agents" data-section="02 // The Units" className="relative overflow-hidden md:h-svh">
      <div ref={track} className="flex h-full flex-col gap-6 px-[clamp(1rem,3.2vw,3rem)] py-[14vh] md:w-max md:flex-row md:items-center md:gap-8 md:py-0">
        {/* intro panel */}
        <div className="flex shrink-0 flex-col justify-center md:w-[42vw] md:pr-[4vw]">
          <Label n="02" meta="FIVE UNITS · ONE BRAIN">The agents</Label>
          <h2 className="mt-10 font-poster text-h1 text-signal" data-warp>
            Meet your
            <br />
            <span className="text-beige">new staff.</span>
          </h2>
          <p className="mt-8 max-w-[38ch] font-body text-lead text-beige/80">
            Each agent does one job extremely well and shares one memory with the others — so a call the Receptionist takes becomes a booking, an invoice and a review request without anyone touching it.
          </p>
        </div>

        {AGENTS.map((a, i) => {
          const inverted = i === 1 || i === 3; // beige colour-blocks punctuate the run
          return (
            <article
              key={a.code}
              className={`chamfer relative flex shrink-0 flex-col justify-between p-7 md:h-[72vh] md:w-[min(30vw,460px)] md:p-9 ${
                inverted ? "bg-beige text-flag" : "border border-signal/30 bg-slate-deep/80 text-beige backdrop-blur-sm"
              }`}
            >
              <header className="flex items-start justify-between font-label">
                <span className={inverted ? "text-flag" : "text-signal"}>{a.code} / UNIT</span>
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${inverted ? "bg-flag" : "bg-beige"} animate-pulse`} /> Online
                </span>
              </header>

              <div className="my-10 md:my-0">
                <h3 className="font-poster text-[clamp(2.25rem,3.6vw,3.75rem)] leading-[0.88]">{a.name}</h3>
                <p className={`mt-5 font-body text-lg leading-snug ${inverted ? "text-flag/85" : "text-beige/80"}`}>{a.line}</p>
              </div>

              <dl className={`grid gap-3 border-t pt-5 font-mono text-[13px] ${inverted ? "border-flag/30" : "border-signal/25"}`}>
                {(
                  [
                    ["Input", a.input],
                    ["Action", a.action],
                    ["Output", a.output],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[72px_1fr] gap-3">
                    <dt className={`font-label ${inverted ? "text-flag/60" : "text-signal"}`}>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>

              <footer className={`mt-6 flex items-end justify-between ${inverted ? "text-flag" : "text-signal/60"}`}>
                <Barcode code={a.code + a.name} />
                <span className="font-label">0{i + 1}/05</span>
              </footer>
            </article>
          );
        })}
        <div className="hidden w-[10vw] shrink-0 md:block" />
      </div>
    </section>
  );
}
