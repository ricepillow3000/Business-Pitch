"use client";

import { useEffect, useRef, useState } from "react";
import { EMAIL as email, GMAIL as gmail } from "@/lib/contact";
import { smooth } from "@/lib/lenis";

/**
 * "Start the conversation" button. Clicking it opens a small menu so the
 * visitor picks: write in Gmail (new tab) or copy the address. There is
 * deliberately no mailto: link, which would open Outlook on most PCs.
 * Closes on Escape or a click outside.
 */
export function ContactMenu() {
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

  // Postel's law: accept whatever the browser allows. Modern clipboard first,
  // then the old select-and-copy trick (works on plain http / older browsers).
  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(email);
      ok = true;
    } catch {
      const t = Object.assign(document.createElement("textarea"), { value: email, readOnly: true });
      t.style.cssText = "position:fixed;opacity:0";
      document.body.append(t);
      t.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        /* still blocked: the address stays visible on the page */
      }
      t.remove();
    }
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Snappy (≤300ms) and staggered: the rows settle in just after the panel (follow-through).
  const row = (i: number, extra = "") => ({
    className: `flex w-full items-center gap-5 px-5 py-4 text-left transition-[background-color,opacity,translate] duration-300 ease-expo hover:bg-slate-line/60 ${
      open ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
    } ${extra}`,
    style: { transitionDelay: open ? `${60 + i * 50}ms` : "0ms" },
  });

  return (
    <div ref={root} className="relative w-fit">
      <button
        type="button"
        data-magnetic
        aria-expanded={open}
        aria-controls="contact-options"
        onClick={() => setOpen((v) => !v)}
        className="group block"
      >
        {/* The button moves (magnetic, GSAP); its face squashes on press (CSS). Kept on
            separate elements because GSAP resets the CSS `scale` of what it animates. */}
        <span
          data-press
          className="chamfer inline-flex items-center gap-8 bg-beige py-6 pr-6 pl-8 text-flag-deep transition-[scale] duration-150 ease-out group-active:scale-[0.96] md:py-8 md:pr-8 md:pl-10"
        >
          <span className="relative block overflow-hidden font-wide text-sm md:text-base">
            <span className="block transition-transform duration-500 ease-expo group-hover:-translate-y-full">Start the conversation</span>
            <span aria-hidden className="absolute inset-0 translate-y-full transition-transform duration-500 ease-expo group-hover:translate-y-0">
              Start the conversation
            </span>
          </span>
          <span aria-hidden className="grid h-9 w-9 place-items-center bg-flag-deep text-beige">
            {/* anticipation: the arrow winds back while pressed, then launches */}
            <span
              className={`transition-[rotate,translate] duration-300 ease-expo group-active:-translate-x-0.5 group-active:translate-y-0.5 ${
                open ? "rotate-90" : "group-hover:rotate-45"
              }`}
            >
              ↗
            </span>
          </span>
        </span>
      </button>

      <div
        id="contact-options"
        className={`absolute top-full left-0 z-10 mt-3 w-[min(100%,26rem)] min-w-[18rem] border border-flag/40 bg-slate shadow-2xl transition-[opacity,translate,visibility] duration-250 ease-expo ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <p className="border-b border-slate-line px-5 py-3 font-hud text-flag">// How would you like to email?</p>
        <a href={gmail} target="_blank" rel="noopener noreferrer" {...row(0)} onClick={() => setOpen(false)}>
          <span className="font-hud text-flag">01</span>
          <span className="flex-1">
            <span className="block font-wide text-sm text-beige">Gmail</span>
            <span className="block text-sm text-flag">Opens a new email in Gmail</span>
          </span>
          <span aria-hidden className="text-beige">↗</span>
        </a>
        <button type="button" {...row(1, copied ? "bg-flag/15" : "")} onClick={copy}>
          <span className="font-hud text-flag">02</span>
          <span className="flex-1">
            <span className="block font-wide text-sm text-beige">{copied ? "Copied ✓" : "Copy address"}</span>
            <span className="block text-sm break-all text-flag">{email}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
