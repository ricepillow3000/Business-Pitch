import { EMAIL, GMAIL } from "@/lib/contact";

export type LegalSection = { heading: string; body: React.ReactNode[] };

/** Email link used inside legal copy (opens Gmail, like everywhere else on the site). */
export const Mail = () => (
  <a href={GMAIL} target="_blank" rel="noopener noreferrer" className="hit text-beige underline decoration-slate-line underline-offset-4">
    {EMAIL}
    <span aria-hidden> ↗</span>
    <span className="sr-only"> (opens Gmail in a new tab)</span>
  </a>
);

/**
 * Plain, readable legal page in the site's HUD style. A full page load (not a
 * client-side route), so the loader, HUD and smooth scroll start fresh.
 */
export function LegalPage({ label, title, updated, sections }: { label: string; title: string; updated: string; sections: LegalSection[] }) {
  return (
    <main>
      <section id="top" data-section data-label={label} className="gutter relative min-h-svh pt-32 pb-28 md:pt-44">
        <div className="flex items-center gap-4 font-hud text-flag">
          <span className="h-1.5 w-1.5 bg-beige" />
          <span>// {label}</span>
          <span className="h-px flex-1 bg-slate-line" />
        </div>
        <h1 className="quiet mt-16 w-fit font-wide text-display text-beige md:mt-24">{title}</h1>
        <p className="mt-6 font-hud text-flag">Last updated // {updated}</p>

        <div className="mt-16 max-w-5xl md:mt-24">
          {sections.map((s) => (
            <div key={s.heading} className="grid gap-4 border-t border-slate-line py-8 md:grid-cols-[14rem_1fr] md:gap-10">
              <h2 className="font-hud text-beige">{s.heading}</h2>
              <div className="quiet max-w-[62ch] space-y-4 leading-relaxed text-flag">
                {s.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap gap-x-10 gap-y-4 border-t border-slate-line pt-8 font-hud text-flag">
          <a href="/" className="hit">Back to JIDO</a>
          <a href="/privacy" className="hit">Privacy</a>
          <a href="/terms" className="hit">Terms</a>
        </div>
      </section>
    </main>
  );
}
