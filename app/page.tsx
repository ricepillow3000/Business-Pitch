"use client";

import { useRef } from "react";
import { ContactMenu } from "@/components/ContactMenu";
import { Logo } from "@/components/Logo";
import { Plus } from "@/components/Plus";
import { WorkflowGraph } from "@/components/WorkflowGraph";
import { EMAIL, GMAIL } from "@/lib/contact";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { onReveal } from "@/lib/intro";

const TASKS = ["Re-typing form entries", "Chasing unpaid invoices", "Booking and rebooking", "Updating the CRM"];
const WORKFLOWS = [
  { name: "Invoicing", line: "Completed jobs become invoices. Payments are matched to them." },
  { name: "Scheduling", line: "Requests become booked appointments, with reminders sent." },
  { name: "CRM", line: "Every enquiry lands in one clean, up-to-date record." },
];

/* ── small building blocks ─────────────────────────────────────────── */

/** `■ // THE FRICTION ───────` (the square echoes a block of the logo) */
function Tag({ children }: { children: string }) {
  return (
    <div data-reveal className="flex items-center gap-4 font-hud text-flag">
      <span className="h-1.5 w-1.5 bg-beige" />
      <span>// {children}</span>
      <span className="h-px flex-1 bg-slate-line" />
    </div>
  );
}

/** A row of five crosshairs spanning the grid (Lusion-style divider). */
function PlusRow() {
  return (
    <div data-hero-fade className="flex justify-between text-flag/70">
      {Array.from({ length: 5 }, (_, i) => <Plus key={i} />)}
    </div>
  );
}

/** One hero headline line in its own mask, so it can rise into view. */
function Line({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`block overflow-hidden pb-[0.06em] ${className}`}>
      <span data-hero-line className="block">{children}</span>
    </span>
  );
}

/* ── page ──────────────────────────────────────────────────────────── */

export default function Home() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      // HERO: waits for the loader. Same ease + duration as the curtain split,
      // so the page appears to be *uncovered* by the letters rather than animate after them.
      gsap.set("[data-hero-line]", { yPercent: 110 });
      gsap.set("[data-hero-fade]", { autoAlpha: 0, y: 24 });
      const offReveal = onReveal(
        contextSafe!(() => {
          gsap.timeline({ defaults: { duration: 1.2, ease: "split" } })
            .fromTo("[data-hero]", { scale: 1.06 }, { scale: 1 }, 0)
            .to("[data-hero-line]", { yPercent: 0, stagger: 0.08 }, 0.05)
            .to("[data-hero-fade]", { autoAlpha: 1, y: 0, stagger: 0.07 }, 0.25);
        }),
      );

      // Hero drifts up and dims as you leave it: sections hand over instead of cutting.
      gsap.to("[data-hero]", {
        yPercent: -12,
        autoAlpha: 0.25,
        ease: "none",
        scrollTrigger: { trigger: "#top", start: "top top", end: "bottom top", scrub: true },
      });

      // Generic staggered reveals for everything marked [data-reveal].
      gsap.set("[data-reveal]", { autoAlpha: 0, y: 40 });
      gsap.utils.toArray<HTMLElement>("section").forEach((section) => {
        const items = section.querySelectorAll("[data-reveal]");
        if (items.length)
          gsap.to(items, { autoAlpha: 1, y: 0, stagger: 0.08, scrollTrigger: { trigger: section, start: "top 78%" } });
      });

      // Section headlines: masked line-by-line rise.
      gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) =>
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, { yPercent: 110, duration: 1.3, stagger: 0.09, scrollTrigger: { trigger: el, start: "top 85%" } }),
        }),
      );

      // FRICTION: the statement lights up word by word as you read it.
      SplitText.create("[data-words]", {
        type: "words",
        autoSplit: true,
        onSplit: (self) =>
          gsap.fromTo(self.words, { opacity: 0.14 }, {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: { trigger: "[data-words]", start: "top 80%", end: "bottom 45%", scrub: true },
          }),
      });

      // …and the manual tasks get struck off, one after another.
      gsap.timeline({ scrollTrigger: { trigger: "[data-strikes]", start: "top 75%", end: "bottom 50%", scrub: true } })
        .to("[data-bar]", { scaleX: 1, stagger: 0.5, ease: "none" })
        .to("[data-task]", { opacity: 0.35, stagger: 0.5, ease: "none" }, 0.25);

      return offReveal;
    },
    { scope: root },
  );

  return (
    <main ref={root}>
      {/* ── THE HERO ─────────────────────────────────────── */}
      <section id="top" data-section data-label="OVERVIEW" className="gutter relative flex min-h-svh flex-col justify-end overflow-hidden pt-28 pb-20 md:pb-24">
        <div data-hero className="flex flex-col gap-10 md:gap-14">
          <p data-hero-fade className="font-hud text-flag">[ AI automation // local business ]</p>
          <h1 className="quiet font-wide text-mega text-beige">
            <Line>Intelligent</Line>
            <Line className="md:pl-[12vw]">workflows.</Line>
          </h1>
          <PlusRow />
          <div className="grid items-end gap-10 md:grid-cols-12">
            <p data-hero-fade className="quiet max-w-[36ch] text-lead text-flag md:col-span-6">
              We build intelligent workflows for local businesses. Automate the repetitive, focus on the essential.
            </p>
            <a href="#friction" data-hero-fade className="hit w-fit font-hud text-flag md:col-span-2 md:col-start-11 md:justify-self-end">
              Scroll ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── THE FRICTION ─────────────────────────────────── */}
      <section id="friction" data-section data-label="FRICTION" className="gutter relative py-32 md:py-48">
        <Tag>The friction</Tag>
        <h2 data-words className="quiet mt-16 max-w-[17ch] font-wide text-display text-beige md:mt-24">
          The average business loses hours a week to manual tasks.
        </h2>
        <div className="mt-20 grid gap-14 md:mt-32 md:grid-cols-12">
          <ul data-strikes className="quiet space-y-4 font-hud text-flag md:col-span-4">
            {TASKS.map((t) => (
              <li key={t} className="relative w-fit">
                <span data-task>{t}</span>
                <span data-bar className="absolute top-1/2 left-0 h-px w-full origin-left scale-x-0 bg-beige" />
              </li>
            ))}
          </ul>
          <p data-lines className="quiet font-wide text-[clamp(1.5rem,2.6vw,2.75rem)] leading-[1.05] text-beige md:col-span-7 md:col-start-6 md:text-right">
            We implement systems to reclaim that time.
          </p>
        </div>
      </section>

      {/* ── THE AUTOMATION ───────────────────────────────── */}
      <section id="automation" data-section data-label="AUTOMATION" className="gutter relative py-32 md:py-48">
        <Tag>The automation</Tag>
        <h2 data-lines className="quiet mt-16 w-fit font-wide text-display text-beige md:mt-24">Connected, quietly.</h2>
        <div className="mt-12 grid items-center gap-20 md:mt-16 md:grid-cols-12">
          <div className="quiet md:col-span-5">
            <p data-reveal className="mt-8 max-w-[38ch] text-lead text-flag">
              We connect the tools you already use. Routine work moves between them on its own.
            </p>
            <ol className="mt-14 border-t border-slate-line">
              {WORKFLOWS.map((w, i) => (
                <li key={w.name} data-reveal className="grid grid-cols-[3.5rem_1fr] gap-y-1 border-b border-slate-line py-5">
                  <span className="font-hud text-flag">0{i + 1}</span>
                  <span className="font-wide text-sm text-beige">{w.name}</span>
                  <span className="col-start-2 text-sm leading-relaxed text-flag">{w.line}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <WorkflowGraph />
          </div>
        </div>
      </section>

      {/* ── THE INITIATION ───────────────────────────────── */}
      <section id="initiation" data-section data-label="INITIATION" className="gutter relative flex min-h-svh flex-col pt-32 pb-24 md:pt-48">
        <Tag>The initiation</Tag>
        <h2 data-lines className="quiet mt-16 max-w-[18ch] font-wide text-display text-beige md:mt-24">
          Let systems handle the mechanical.
        </h2>
        <p data-reveal className="quiet mt-8 w-fit text-lead text-flag">Focus on what you do best.</p>

        {/* z-20: the reveal transform makes this a stacking context; keep the open menu above what follows */}
        <div data-reveal className="relative z-20 mt-16 md:mt-20">
          <ContactMenu />
        </div>

        <dl data-reveal className="quiet mt-12 grid w-fit grid-cols-[5rem_1fr] gap-x-6 md:mt-14">
          <dt className="self-center font-hud text-flag">Email</dt>
          <dd>
            <a href={GMAIL} target="_blank" rel="noopener noreferrer" className="hit text-lead break-all text-beige">{EMAIL}<span aria-hidden> ↗</span><span className="sr-only"> (opens Gmail in a new tab)</span></a>
          </dd>
        </dl>

        <footer className="mt-auto grid gap-y-6 pt-32 font-hud text-flag md:grid-cols-4">
          <div className="col-span-full mb-4 flex justify-between text-flag/70">
            {Array.from({ length: 5 }, (_, i) => <Plus key={i} />)}
          </div>
          <span className="flex flex-col gap-3">
            <Logo markClassName="h-8 w-8" />
            <span>© 2026 JIDO</span>
          </span>
          <a href={GMAIL} target="_blank" rel="noopener noreferrer" className="hit w-fit normal-case tracking-wider">{EMAIL}<span aria-hidden> ↗</span><span className="sr-only"> (opens Gmail in a new tab)</span></a>
          <span>SYS.STATUS // ONLINE</span>
          <a href="#top" className="hit w-fit md:justify-self-end">Back to top ↑</a>
        </footer>
      </section>
    </main>
  );
}
