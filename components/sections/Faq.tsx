import { FAQ } from "@/lib/config";
import { Label } from "./Label";

export function Faq() {
  return (
    <section id="faq" data-section="06 // Questions" className="relative py-[14vh]">
      <div className="poster-grid">
        <div className="col-span-12 mb-12">
          <Label n="06" meta="PLAIN ENGLISH">Questions owners ask</Label>
        </div>
        <div className="col-span-12 md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-t border-signal/25 py-6 last:border-b">
              <summary className="flex list-none items-center justify-between gap-6 font-poster text-[clamp(1.25rem,2.4vw,2.25rem)] leading-tight text-beige [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="font-mono text-2xl text-signal transition-transform duration-500 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-5 max-w-[60ch] font-body text-lead text-beige/75">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
