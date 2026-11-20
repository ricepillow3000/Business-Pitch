import { LEGAL_PAGES, type LegalHref } from "@/lib/legal";

/**
 * Footer legal navigation. Each link carries a view-transition-name that matches
 * its page title, so clicking "Privacy" morphs the link into the Privacy page
 * heading (shared element transition). The current page's link is left unnamed,
 * because its title already uses that name.
 */
export function LegalLinks({ current, className = "" }: { current?: LegalHref; className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex flex-wrap gap-x-8 ${className}`}>
      {LEGAL_PAGES.map((p) => (
        <a
          key={p.href}
          href={p.href}
          aria-current={p.href === current ? "page" : undefined}
          // min-h-11: a real 44px row, so stacked links never steal each other's taps
          className={`inline-flex min-h-11 min-w-11 w-fit items-center ${p.href === current ? "text-beige" : ""}`}
          style={p.href === current ? undefined : { viewTransitionName: p.vt }}
        >
          {p.label}
        </a>
      ))}
    </nav>
  );
}
