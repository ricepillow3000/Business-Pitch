"use client";

import { Arrow } from "@/components/Arrow";
import { useRef, useState } from "react";
import { ContactMenu } from "@/components/ContactMenu";
import { CopyEmail } from "@/components/CopyEmail";
import { TopicCombobox } from "@/components/TopicCombobox";
import { Plus } from "@/components/Plus";
import { SiteFooter } from "@/components/SiteFooter";
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
    <div className="flex items-center gap-4 font-label text-flag">
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
  const [topic, setTopic] = useState("");

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

      // No fade-up on every section. Each section has its own single entrance:
      //   hero: uncovered by the loader · friction: words light up, tasks get struck off
      //   automation: the diagram assembles · initiation: the headline rises from its mask
      // Everything else is simply there.
      gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) =>
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, { yPercent: 110, duration: 1.3, stagger: 0.09, scrollTrigger: { trigger: el, start: "top 85%" } }),
        }),
      );

      // FRICTION: the statement lights up word by word as you read it (scrubbed, not a fade-in).
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
        .to("[data-task]", { opacity: 0.85, stagger: 0.5, ease: "none" }, 0.25); // struck off, still readable (4.5:1+)

      return offReveal;
    },
    { scope: root },
  );

  return (
    <main ref={root}>
      {/* ── THE HERO ─────────────────────────────────────── */}
      <section id="top" data-section data-label="OVERVIEW" className="gutter relative flex min-h-svh flex-col justify-end overflow-hidden pt-28 pb-20 md:pb-24">
        <div data-hero className="flex flex-col gap-10 md:gap-14">
          <h1 className="quiet font-wide text-mega text-beige">
            <Line>Intelligent</Line>
            <Line className="md:pl-[12vw]">workflows.</Line>
          </h1>
          <PlusRow />
          <div className="grid items-end gap-10 md:grid-cols-12">
            <p data-hero-fade className="quiet max-w-[36ch] text-lead text-flag md:col-span-6">
              We build intelligent workflows for local businesses. Automate the repetitive, focus on the essential.
            </p>
            <a href="#friction" data-hero-fade className="hit flex w-fit items-center gap-2 font-label text-flag md:col-span-2 md:col-start-11 md:justify-self-end">
              Scroll <Arrow dir="down" />
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
          <ul data-strikes className="quiet space-y-4 font-label text-flag md:col-span-4">
            {TASKS.map((t) => (
              <li key={t} className="relative w-fit">
                <span data-task>{t}</span>
                <span data-bar className="absolute top-1/2 left-0 h-px w-full origin-left scale-x-0 bg-beige" />
              </li>
            ))}
          </ul>
          <p className="quiet font-wide text-[clamp(1.5rem,2.6vw,2.75rem)] leading-[1.05] text-beige md:col-span-7 md:col-start-6 md:text-right">
            We implement systems to reclaim that time.
          </p>
        </div>
      </section>

      {/* ── THE AUTOMATION ───────────────────────────────── */}
      <section id="automation" data-section data-label="AUTOMATION" className="gutter relative py-32 md:py-48">
        <Tag>The automation</Tag>
        <h2 className="quiet mt-16 w-fit font-wide text-display text-beige md:mt-24">Connected, quietly.</h2>
        <div className="mt-12 grid items-center gap-20 md:mt-16 md:grid-cols-12">
          <div className="quiet md:col-span-5">
            <p className="mt-8 max-w-[38ch] text-lead text-flag">
              We connect the tools you already use. Routine work moves between them on its own.
            </p>
            <ol className="mt-14 border-t border-slate-line">
              {WORKFLOWS.map((w) => (
                <li key={w.name} className="grid gap-x-6 gap-y-1 border-b border-slate-line py-5 sm:grid-cols-[8rem_1fr]">
                  <span className="font-wide text-sm text-beige">{w.name}</span>
                  <span className="text-sm leading-relaxed text-flag">{w.line}</span>
                </li>
              ))}
            </ol>
            <a href="/services" className="mt-6 inline-flex min-h-11 items-center font-label text-beige">
              See everything we automate
            </a>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <WorkflowGraph />
          </div>
        </div>
      </section>

      {/* ── THE INITIATION ───────────────────────────────── */}
      <section id="initiation" data-section data-label="INITIATION" className="gutter relative flex min-h-svh flex-col pt-32 pb-24 md:pt-48">
        <Tag>The initiation</Tag>
        <h2 data-lines className="quiet mt-16 max-w-[20ch] font-wide text-display text-beige md:mt-24">
          Let systems handle the mechanical.
        </h2>
        <p className="quiet mt-8 w-fit text-lead text-flag">Focus on what you do best.</p>

        {/* z-30 / z-20: keep the open lists above what follows */}
        <div className="relative z-30 mt-14 md:mt-16">
          <TopicCombobox value={topic} onChange={setTopic} />
        </div>
        <div className="relative z-20 mt-10 md:mt-12">
          <ContactMenu topic={topic} />
        </div>

        <dl className="quiet mt-12 grid w-fit grid-cols-[5rem_1fr] gap-x-6 md:mt-14">
          <dt className="self-center font-label text-flag">Email</dt>
          <dd className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href={GMAIL} target="_blank" rel="noopener noreferrer" className="hit text-lead break-all text-beige">{EMAIL}&nbsp;<Arrow /><span className="sr-only"> (opens Gmail in a new tab)</span></a>
            <CopyEmail />
          </dd>
        </dl>

        <SiteFooter />
      </section>
    </main>
  );
}
