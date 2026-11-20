import { SiteFooter } from "./SiteFooter";

/**
 * Layout for the inner pages (Services, Pricing, Book a call, Contact):
 * headline, short intro, content, shared footer (no label badge above the headline:
 * the HUD's bottom label already names the page).
 * One [data-section] so the HUD's bottom label names the page.
 */
export function SitePage({ label, title, intro, children }: { label: string; title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <main>
      <section id="top" data-section data-label={label} className="gutter relative flex min-h-svh flex-col pt-32 pb-24 md:pt-44">
        <h1 className="quiet max-w-[18ch] font-wide text-display text-beige">{title}</h1>
        <div className="quiet mt-8 max-w-[52ch] space-y-4 text-lead text-flag">{intro}</div>
        <div className="mt-16 md:mt-24">{children}</div>
        <SiteFooter />
      </section>
    </main>
  );
}

/** A labelled status chip: tells the visitor honestly how far along something is. */
export function Status({ children }: { children: string }) {
  return <span className="inline-flex w-fit items-center border border-slate-line px-2.5 py-1 font-label text-flag">{children}</span>;
}

/** Primary and secondary next steps, shown at the end of each page. */
export function NextSteps() {
  return (
    <div className="mt-20 flex flex-wrap gap-4">
      <a href="/book" className="chamfer inline-flex min-h-11 items-center bg-beige px-7 py-4 font-wide text-sm text-flag-deep">
        Book a discovery call
      </a>
      <a href="/contact" className="inline-flex min-h-11 items-center border border-beige/40 px-7 py-4 font-wide text-sm text-beige">
        Send a message
      </a>
    </div>
  );
}
