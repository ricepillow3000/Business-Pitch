"use client";

import { useState } from "react";
import { gsap } from "@/lib/gsap";

const TYPES = ["Clinic / dental", "Trades / HVAC", "Salon / spa", "Law / accounting", "Restaurant", "Other"];
const PAINS = ["Missed calls", "Scheduling", "Invoicing", "Reviews", "Data entry"];

const field = "w-full border-b border-signal/40 bg-transparent py-3 font-body text-lead text-beige placeholder:text-beige/30 focus:border-beige focus:outline-none";

/**
 * Lazy-loaded chunk (dynamic import) that the TransitionProvider pre-warms on idle,
 * so clicking "Book" never waits on the network.
 * TODO: wire submit to a real endpoint (Cal.com / Formspree / Cloudflare Worker) before launch.
 */
export default function BookingForm() {
  const [type, setType] = useState(TYPES[0]);
  const [pains, setPains] = useState<string[]>(["Missed calls"]);
  const [sent, setSent] = useState(false);

  const toggle = (p: string) => setPains((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  if (sent)
    return (
      <div className="chamfer bg-beige p-10 text-flag">
        <p className="font-label">Transmission received</p>
        <p className="mt-4 font-poster text-h2">We&rsquo;ll be in touch within one business day.</p>
      </div>
    );

  return (
    <form
      className="grid gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        gsap.to(e.currentTarget, { clipPath: "inset(50% 0% 50% 0%)", duration: 0.6, ease: "expo.in", onComplete: () => setSent(true) });
      }}
    >
      <div className="grid gap-8 md:grid-cols-2">
        <label className="block">
          <span className="font-label text-signal">Your name</span>
          <input required name="name" autoComplete="name" placeholder="Jane Owner" className={field} />
        </label>
        <label className="block">
          <span className="font-label text-signal">Business</span>
          <input required name="business" autoComplete="organization" placeholder="Main St Dental" className={field} />
        </label>
        <label className="block">
          <span className="font-label text-signal">Email</span>
          <input required type="email" name="email" autoComplete="email" placeholder="jane@mainstdental.com" className={field} />
        </label>
        <label className="block">
          <span className="font-label text-signal">Phone</span>
          <input type="tel" name="phone" autoComplete="tel" placeholder="(555) 010-0100" className={field} />
        </label>
      </div>

      <fieldset>
        <legend className="font-label text-signal">Type of business</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`chamfer px-4 py-2.5 font-label transition-colors ${type === t ? "bg-beige text-flag" : "border border-signal/40 text-beige/80 hover:text-beige"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-label text-signal">Biggest time-wasters (pick any)</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {PAINS.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => toggle(p)}
              aria-pressed={pains.includes(p)}
              className={`chamfer px-4 py-2.5 font-label transition-colors ${pains.includes(p) ? "bg-flag text-beige ring-1 ring-signal" : "border border-signal/40 text-beige/80 hover:text-beige"}`}
            >
              {pains.includes(p) ? "■ " : "□ "}
              {p}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="font-label text-signal">Anything else? (optional)</span>
        <textarea name="notes" rows={3} placeholder="We miss about a third of calls on Saturdays…" className={`${field} resize-none`} />
      </label>

      <div className="flex flex-wrap items-center gap-6">
        <button type="submit" data-magnetic data-cursor-label="SEND" className="chamfer bg-beige px-8 py-5 font-label text-sm font-bold text-flag">
          Request my audit →
        </button>
        <p className="font-body text-sm text-beige/60">20 minutes · free · no obligation</p>
      </div>
    </form>
  );
}
