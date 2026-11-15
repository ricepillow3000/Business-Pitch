"use client";

import { useEffect, useRef, useState } from "react";
import { EMAIL as email, gmailFor } from "@/lib/contact";
import { smooth } from "@/lib/lenis";
import { Plus } from "./Plus";

/**
 * "Start the conversation" button. Clicking it opens a small menu so the
 * visitor picks: write in Gmail (new tab) or copy the address. There is
 * deliberately no mailto: link, which would open Outlook on most PCs.
 * Closes on Escape or a click outside.
 */
export function ContactMenu({ topic = "" }: { topic?: string }) {
  const gmail = gmailFor(topic.trim());
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

  // Optimistic update: say "Copied" the instant it is clicked, then confirm in the
  // background; only if every way of copying fails does the label change back.
  // Postel's law: accept whatever the browser allows. Modern clipboard first,
  // then the old select-and-copy trick (works on plain http / older browsers).
  const copy = async () => {
    setCopied(true);
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
    setTimeout(() => setCopied(false), ok ? 2000 : 0);
  };

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
        className={`absolute top-full left-0 z-10 mt-3 w-[min(100%,26rem)] min-w-[18rem] origin-top-left border border-flag/40 bg-slate transition-[opacity,translate,scale,visibility] duration-250 ease-expo ${
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-[0.96] opacity-0"
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
            <span className="block font-wide text-sm text-beige">{copied ? "Copied" : "Copy address"}</span>
            <span className="block text-sm break-all text-flag">{email}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
