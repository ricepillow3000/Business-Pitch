"use client";

import { Arrow } from "./Arrow";
import { useEffect, useRef, useState } from "react";
import { gmailFor } from "@/lib/contact";
import { smooth } from "@/lib/lenis";
import { Plus } from "./Plus";

/**
 * "Start the conversation" button. Clicking it opens a small menu with three
 * ways in (Hick's law: no more): book a discovery call, send a message, or
 * write in Gmail (new tab). There is deliberately no mailto: link, which would
 * open Outlook on most PCs. Closes on Escape or a click outside.
 */
export function ContactMenu({ topic = "" }: { topic?: string }) {
  const gmail = gmailFor(topic.trim());
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // If the menu would open below the fold, glide the page up just enough to show it.
    const panel = document.getElementById("contact-options");
    const overflow = panel ? panel.getBoundingClientRect().bottom + 72 - innerHeight : 0;
    if (overflow > 0) {
      if (smooth.lenis) smooth.lenis.scrollTo(scrollY + overflow, { duration: 1 });
      else scrollBy({ top: overflow, behavior: "smooth" });
    }
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", onDown);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("pointerdown", onDown);
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Snappy (300ms or less) and staggered: the rows settle in just after the panel (follow-through).
  // Hover only swaps the background colour instantly: no hover animation.
  const row = (i: number, extra = "") => ({
    className: `flex w-full items-center gap-5 px-5 py-4 text-left transition-[opacity,translate] duration-300 ease-expo hover:bg-slate-line/60 ${
      open ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
    } ${extra}`,
    style: { transitionDelay: open ? `${60 + i * 50}ms` : "0ms" },
  });

  return (
    <div ref={root} className="relative w-fit">
      <button
        type="button"
        data-cta
        aria-expanded={open}
        aria-controls="contact-options"
        onClick={() => setOpen((v) => !v)}
        className="group block"
      >
        {/* The button stays put while hovered; only its face squashes on press (CSS). */}
        <span
          data-press
          className="chamfer inline-flex items-center gap-8 bg-beige py-6 pr-6 pl-8 text-flag-deep transition-[scale] duration-150 ease-out group-active:scale-[0.96] md:py-8 md:pr-8 md:pl-10"
        >
          <span className="font-wide text-sm md:text-base">Start the conversation</span>
          <span aria-hidden className="grid h-9 w-9 place-items-center bg-flag-deep text-beige">
            {/* HUD crosshair, turns into × while the menu is open. Anticipation: it gathers
                (shrinks) while pressed, then snaps open on release. No hover animation. */}
            <span data-mark className={`block transition-[rotate,scale] duration-300 ease-expo group-active:scale-75 ${open ? "rotate-45" : ""}`}>
              <Plus />
            </span>
          </span>
        </span>
      </button>

      <div
        id="contact-options"
        className={`absolute top-full left-0 z-10 mt-3 w-[min(100%,26rem)] min-w-[18rem] origin-top-left border border-slate-line bg-slate transition-[opacity,translate,scale,visibility] duration-250 ease-expo ${
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-[0.96] opacity-0"
        }`}
      >
        <p className="border-b border-slate-line px-5 py-3 font-label text-flag">// How would you like to start?</p>
        <a href="/book" {...row(0)}>
          <span className="flex-1">
            <span className="block font-wide text-sm text-beige">Book a discovery call</span>
            <span className="block text-sm text-flag">Pick a time that suits you</span>
          </span>
        </a>
        <a href={topic.trim() ? `/contact?topic=${encodeURIComponent(topic.trim())}` : "/contact"} {...row(1)}>
          <span className="flex-1">
            <span className="block font-wide text-sm text-beige">Send a message</span>
            <span className="block text-sm text-flag">A short form, we reply by email</span>
          </span>
        </a>
        <a href={gmail} target="_blank" rel="noopener noreferrer" {...row(2)} onClick={() => setOpen(false)}>
          <span className="flex-1">
            <span className="block font-wide text-sm text-beige">Email in Gmail</span>
            <span className="block text-sm text-flag">Opens a new email in Gmail</span>
          </span>
          <span className="text-beige"><Arrow /></span>
        </a>
      </div>
    </div>
  );
}
