"use client";

import { useState } from "react";
import { EMAIL } from "@/lib/contact";

/**
 * "Copy" button for the email address.
 * Optimistic update: says "Copied" the instant it is clicked, then confirms in the
 * background; only if every way of copying fails does the label change back.
 * Postel's law: modern clipboard first, then the old select-and-copy trick
 * (works on plain http and older browsers).
 */
export function CopyEmail() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    setCopied(true);
    let ok = false;
    try {
      await navigator.clipboard.writeText(EMAIL);
      ok = true;
    } catch {
      const t = Object.assign(document.createElement("textarea"), { value: EMAIL, readOnly: true });
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

  return (
    <button
      type="button"
      data-copy
      onClick={copy}
      aria-live="polite"
      className={`inline-flex min-h-11 min-w-20 items-center justify-center border px-4 font-label ${copied ? "border-beige bg-flag/15 text-beige" : "border-beige/40 text-flag"}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
