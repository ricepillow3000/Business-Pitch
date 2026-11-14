"use client";

import { useEffect, useRef, useState } from "react";
import { smooth } from "@/lib/lenis";

const SUBJECT = "Hello JIDO";

/**
 * "Start the conversation" button. Clicking it opens a small menu so the
 * visitor picks HOW to email: Gmail in a new tab, their own mail app, or
 * copy the address. Closes on Escape or a click outside.
 */
export function ContactMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address is still shown on the page */
    }
  };

  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(SUBJECT)}`;
  const mailto = `mailto:${email}?subject=${encodeURIComponent(SUBJECT)}`;
  const row = "flex w-full items-center gap-5 px-5 py-4 text-left transition-colors hover:bg-slate-line/60";

  return (
    <div ref={root} className="relative w-fit">
      <button
        type="button"
        data-magnetic
        aria-expanded={open}
        aria-controls="contact-options"
        onClick={() => setOpen((v) => !v)}
        className="group chamfer inline-flex items-center gap-8 bg-beige py-6 pr-6 pl-8 text-flag-deep md:py-8 md:pr-8 md:pl-10"
      >
        <span className="relative block overflow-hidden font-wide text-sm md:text-base">
          <span className="block transition-transform duration-700 ease-expo group-hover:-translate-y-full">Start the conversation</span>
          <span aria-hidden className="absolute inset-0 translate-y-full transition-transform duration-700 ease-expo group-hover:translate-y-0">
            Start the conversation
          </span>
        </span>
        <span aria-hidden className="grid h-9 w-9 place-items-center bg-flag-deep text-beige">
          <span className={`transition-transform duration-700 ease-expo ${open ? "rotate-90" : "group-hover:rotate-45"}`}>↗</span>
        </span>
      </button>

      <div
        id="contact-options"
        className={`absolute top-full left-0 z-10 mt-3 w-[min(100%,26rem)] min-w-[18rem] border border-flag/40 bg-slate shadow-2xl transition-[opacity,translate,visibility] duration-500 ease-expo ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <p className="border-b border-slate-line px-5 py-3 font-hud text-flag">// How would you like to email?</p>
        <a href={gmail} target="_blank" rel="noopener noreferrer" className={row} onClick={() => setOpen(false)}>
          <span className="font-hud text-flag">01</span>
          <span className="flex-1">
            <span className="block font-wide text-sm text-beige">Gmail</span>
            <span className="block text-sm text-flag">Opens a new email in Gmail</span>
          </span>
          <span aria-hidden className="text-beige">↗</span>
        </a>
        <a href={mailto} className={row} onClick={() => setOpen(false)}>
          <span className="font-hud text-flag">02</span>
          <span className="flex-1">
            <span className="block font-wide text-sm text-beige">Email app</span>
            <span className="block text-sm text-flag">Outlook, Apple Mail, etc.</span>
          </span>
          <span aria-hidden className="text-beige">→</span>
        </a>
        <button type="button" className={row} onClick={copy}>
          <span className="font-hud text-flag">03</span>
          <span className="flex-1">
            <span className="block font-wide text-sm text-beige">{copied ? "Copied ✓" : "Copy address"}</span>
            <span className="block text-sm break-all text-flag">{email}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
