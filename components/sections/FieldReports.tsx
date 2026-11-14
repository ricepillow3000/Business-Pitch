import { Label } from "./Label";

/**
 * 05 — Proof. Intentionally shipped as clearly-marked placeholders:
 * replace with real client results before launch (never invent testimonials).
 */
const SLOTS = ["Dental clinic", "HVAC / trades", "Salon & spa"];

export function FieldReports() {
  return (
    <section id="reports" data-section="05 // Field Reports" className="relative py-[14vh]">
      <div className="poster-grid gap-y-6">
        <div className="col-span-12 mb-10">
          <Label n="05" meta="CLIENT RESULTS">Field reports</Label>
        </div>
        {SLOTS.map((s, i) => (
          <article key={s} data-mask="up" className="chamfer col-span-12 flex min-h-[46vh] flex-col justify-between border border-dashed border-signal/40 p-7 md:col-span-4">
            <div className="flex justify-between font-label text-signal">
              <span>Case file 0{i + 1}</span>
              <span className="text-beige/60">Awaiting data</span>
            </div>
            <div>
              <p className="font-poster text-[clamp(3rem,5vw,5rem)] leading-none text-beige/30 text-outline">00 HRS</p>
              <p className="mt-2 font-label text-signal">saved per week</p>
            </div>
            <div className="border-t border-signal/25 pt-5">
              <p className="font-poster text-h3 text-beige">{s}</p>
              <p className="mt-2 font-body text-sm text-beige/60">[Placeholder: replace with a real client result and quote before launch.]</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
