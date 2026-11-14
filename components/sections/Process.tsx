import { PROCESS } from "@/lib/config";
import { Label } from "./Label";

/** 03 — Flag Blue colour-block poster, constructed by an expanding mask. */
export function Process() {
  return (
    <section id="process" data-section="03 // Protocol" className="relative px-[clamp(0.5rem,1.5vw,1.5rem)] py-[10vh]">
      <div data-mask="center" className="relative overflow-hidden bg-flag py-[12vh]">
        <div className="hazard absolute left-0 right-0 top-0 h-3 text-beige/80" aria-hidden />
        <div className="poster-grid">
          <div className="col-span-12 mb-12">
            <Label n="03" meta="TYPICAL TIMELINE · 2–4 WEEKS">The protocol</Label>
          </div>
          <h2 data-scale className="col-span-12 mb-[10vh] origin-bottom-left font-poster text-poster text-beige">
            Four steps.
            <br />
            <span className="text-outline">Zero chaos.</span>
          </h2>

          {PROCESS.map((p) => (
            <div key={p.n} className="col-span-12 border-t border-beige/25 py-8 sm:col-span-6 lg:col-span-3 lg:pr-6">
              <div className="font-poster text-[clamp(4rem,7vw,7rem)] leading-none tabular-nums text-signal">{p.n}</div>
              <h3 data-split className="mt-6 font-poster text-h3 text-beige">{p.t}</h3>
              <p className="mt-4 max-w-[34ch] font-body text-base leading-relaxed text-beige/80">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
