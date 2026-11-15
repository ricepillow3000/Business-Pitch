import { LEGAL, LEGAL_PAGES, LEGAL_STATUS, LAST_UPDATED, PLACEHOLDER, type LegalHref, type LegalKey } from "@/lib/legal";
import { LegalLinks } from "./LegalLinks";

export type LegalSection = { id: string; heading: string; body: React.ReactNode };

/* ── small building blocks for legal copy ───────────────────────────── */

/** A business detail from lib/legal.ts, or a clearly marked placeholder while it is missing. */
export function Ph({ k }: { k: LegalKey }) {
  const v = LEGAL[k];
  if (v) return <>{v}</>;
  return (
    <span data-placeholder className="border-b border-dashed border-beige/60 text-beige">
      [{PLACEHOLDER[k]}]
    </span>
  );
}

export const P = ({ children }: { children: React.ReactNode }) => <p className="max-w-[52ch] text-flag">{children}</p>;

/** Bullet list with small square markers (a block of the logo), never checkmarks. */
export function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="max-w-[52ch] space-y-2 text-flag">
      {items.map((it, i) => (
        <li key={i} className="relative pl-5 before:absolute before:top-[0.6em] before:left-0 before:h-1.5 before:w-1.5 before:bg-flag/70">
          {it}
        </li>
      ))}
    </ul>
  );
}

/** A short sub-heading inside a section. */
export const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="pt-2 font-wide text-sm text-beige">{children}</h3>;

/** An important notice, framed like a HUD panel. */
export function Note({ label = "Important", children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[52ch] border border-slate-line px-5 py-4">
      <p className="font-label text-beige">// {label}</p>
      <div className="mt-2 space-y-3 text-flag">{children}</div>
    </div>
  );
}

/** In-text link to another legal page or section. */
export const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="prose-link hit text-beige">
    {children}
  </a>
);

/* ── the page ──────────────────────────────────────────────────────── */

/**
 * Readable legal page in the site's HUD style: draft notice, dates, a table of
 * contents (a collapsible list on phones, a sticky column on wide screens),
 * numbered sections and links to the other legal pages.
 */
export function LegalPage({ href, label, intro, sections }: { href: LegalHref; label: string; intro: React.ReactNode; sections: LegalSection[] }) {
  const page = LEGAL_PAGES.find((p) => p.href === href)!;
  const toc = (
    <ol className="font-label">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="inline-flex min-h-11 items-center gap-3 text-flag">
            <span className="text-flag">{String(i + 1).padStart(2, "0")}</span>
            <span>{s.heading}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <main>
      <section id="top" data-section data-label={label} className="gutter relative min-h-svh pt-32 pb-28 md:pt-44">
        {/* no label badge above the title: the HUD's bottom label already names the page */}
        <h1 className="quiet w-fit font-wide text-display text-beige" style={{ viewTransitionName: page.vt }}>
          {page.title}
        </h1>
        <p className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-label text-flag">
          <span>Effective // <Ph k="effectiveDate" /></span>
          <span>Last updated // {LAST_UPDATED}</span>
        </p>
        {LEGAL_STATUS && (
          <p data-legal-status className="mt-8 w-fit max-w-[52ch] border border-beige/50 px-4 py-3 font-label text-beige">
            {LEGAL_STATUS}
          </p>
        )}
        <div className="quiet mt-10 max-w-[52ch] space-y-4 text-lead text-flag">{intro}</div>

        <div className="mt-16 grid gap-12 md:mt-24 md:grid-cols-[17rem_1fr] md:gap-16">
          {/* table of contents: collapsible on phones (progressive disclosure), sticky beside the text on wide screens */}
          <details className="border border-slate-line px-5 md:hidden">
            <summary className="flex min-h-12 items-center font-label text-beige">On this page</summary>
            <div className="pb-4">{toc}</div>
          </details>
          <nav aria-label="On this page" className="hidden self-start md:sticky md:top-28 md:block">
            <p className="mb-5 font-label text-beige">// On this page</p>
            {toc}
          </nav>

          <div>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28 border-t border-slate-line py-10 first:border-t-0 first:pt-0">
                <div className="flex items-baseline gap-4">
                  <span aria-hidden className="font-label text-flag">{String(i + 1).padStart(2, "0")}</span>
                  <h2 id={`${s.id}-h`} className="font-wide text-[clamp(1.125rem,1.6vw,1.5rem)] leading-tight text-beige">
                    {s.heading}
                  </h2>
                </div>
                <div className="quiet mt-6 space-y-4 leading-relaxed">{s.body}</div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-x-10 gap-y-6 border-t border-slate-line pt-8 font-label text-flag">
          <LegalLinks current={href} />
          <a href="/" className="hit">Back to JIDO</a>
        </div>
      </section>
    </main>
  );
}
