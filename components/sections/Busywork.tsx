import { BUSYWORK } from "@/lib/config";
import { Label } from "./Label";

/** 01 — The problem, as a poster: every repetitive task gets struck through as you scroll. */
export function Busywork() {
  return (
    <section id="busywork" data-section="01 // The Busywork" className="relative py-[18vh]">
      <div className="poster-grid">
        <div className="col-span-12 mb-14 md:mb-20">
          <Label n="01" meta="AUDIT · REPETITIVE LOAD">The busywork tax</Label>
        </div>

        <h2 data-split className="col-span-12 mb-16 max-w-[16ch] font-poster text-h1 text-signal md:col-span-9" data-warp>
          Your team is doing <span className="text-beige">a robot&rsquo;s job.</span>
        </h2>

        <ul className="col-span-12 border-t border-signal/25 md:col-span-9">
          {BUSYWORK.map((t, i) => (
            <li key={t} data-strike className="relative flex items-baseline gap-5 border-b border-signal/25 py-4 md:gap-8 md:py-5">
              <span className="font-label tabular-nums text-signal">{String(i + 1).padStart(2, "0")}</span>
              <span className="strike-text relative font-poster text-[clamp(1.35rem,3.4vw,3.25rem)] leading-[0.95] text-beige">
                {t}
                <span className="strike-bar absolute left-0 right-0 top-1/2 h-[0.14em] origin-left -translate-y-1/2 bg-beige" style={{ transform: "scaleX(0)" }} />
              </span>
              <span className="ml-auto hidden font-label text-signal/70 md:inline">→ agent</span>
            </li>
          ))}
        </ul>

        <aside className="col-span-12 mt-12 self-end md:col-span-3 md:col-start-10 md:mt-0">
          <div data-mask="up" className="chamfer bg-flag p-6">
            <p className="font-label text-signal">Rule of thumb</p>
            <p className="mt-4 font-body text-lead text-beige">
              Agents take the repetitive work. Your people keep the work that needs a human.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
