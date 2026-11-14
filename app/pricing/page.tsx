import type { Metadata } from "next";
import { BRAND, PLANS } from "@/lib/config";
import { Label } from "@/components/sections/Label";
import { TransitionLink } from "@/components/transition/TransitionLink";

export const metadata: Metadata = { title: `Pricing — ${BRAND.name}` };

/**
 * On this route the brain swings left and its 5 agent hubs light up (lib/routes.ts),
 * so the plans read as "how much of the brain you're switching on".
 */
export default function PricingPage() {
  return (
    <main data-section="P1 // Pricing" className="poster-grid min-h-svh gap-y-10 pb-[14vh] pt-[18vh]">
      <div className="col-span-12 lg:col-span-6 lg:col-start-7" data-enter-fade>
        <Label n="P1" meta="FIXED MONTHLY · NO LOCK-IN">Pricing</Label>
      </div>
      <h1 data-enter className="col-span-12 font-poster text-h1 text-signal lg:col-span-6 lg:col-start-7">
        Switch on
        <br />
        <span className="text-beige">what you need.</span>
      </h1>
      <p data-enter className="col-span-12 max-w-[44ch] font-body text-lead text-beige/80 lg:col-span-6 lg:col-start-7">
        Start with one agent. Add more once it has paid for itself. Every plan is scoped on a free audit call.
      </p>

      <div className="col-span-12 grid gap-4 lg:col-span-6 lg:col-start-7" data-enter-fade>
        {PLANS.map((p) => {
          const featured = "featured" in p && p.featured;
          return (
            <article
              key={p.code}
              className={`chamfer grid gap-5 p-6 md:grid-cols-[1fr_auto] md:p-8 ${featured ? "bg-beige text-flag" : "border border-signal/30 bg-slate-deep/80 text-beige backdrop-blur-sm"}`}
            >
              <div>
                <div className="flex items-center gap-3 font-label">
                  <span className={featured ? "text-flag/70" : "text-signal"}>{p.code}</span>
                  <span className="flex gap-1" aria-label={`${p.units} of 5 agents`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={`h-2 w-4 ${i < p.units ? (featured ? "bg-flag" : "bg-beige") : featured ? "bg-flag/20" : "bg-signal/25"}`} />
                    ))}
                  </span>
                  {featured && <span className="ml-auto bg-flag px-2 py-0.5 text-beige md:ml-2">Most picked</span>}
                </div>
                <h2 className="mt-4 font-poster text-h3">{p.name}</h2>
                <p className={`mt-2 max-w-[44ch] font-body ${featured ? "text-flag/80" : "text-beige/75"}`}>{p.blurb}</p>
                <ul className="mt-4 grid gap-1 font-mono text-[13px] sm:grid-cols-2">
                  {p.features.map((f) => (
                    <li key={f}>▸ {f}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-start justify-between gap-4 md:items-end">
                <p className="font-poster text-h2 leading-none tabular-nums">
                  {p.price}
                  <span className="font-label">{p.unit}</span>
                </p>
                <TransitionLink
                  href="/booking"
                  data-magnetic
                  className={`chamfer px-4 py-2.5 font-label font-bold ${featured ? "bg-flag text-beige" : "bg-beige text-flag"}`}
                >
                  Start with an audit →
                </TransitionLink>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
