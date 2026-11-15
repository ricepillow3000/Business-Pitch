import { EMAIL, GMAIL } from "@/lib/contact";
import { NAV } from "@/lib/site";
import { Arrow } from "./Arrow";
import { LegalLinks } from "./LegalLinks";
import { Ph } from "./LegalPage";
import { Logo } from "./Logo";
import { Plus } from "./Plus";

/** One footer for every page: brand, site links, legal links, email, back to top. */
export function SiteFooter() {
  return (
    <footer className="mt-auto grid gap-x-10 gap-y-8 pt-32 font-label text-flag md:grid-cols-4">
      <div className="col-span-full mb-2 flex justify-between text-flag/70">
        {Array.from({ length: 5 }, (_, i) => (
          <Plus key={i} />
        ))}
      </div>
      <div data-hud-readout className="flex flex-col gap-3 font-hud">
        <Logo markClassName="h-8 w-8" />
        <span>© 2026 JIDO</span>
        <span>SYS.STATUS // ONLINE</span>
      </div>
      <nav aria-label="Site" className="flex flex-col">
        {NAV.map((l) => (
          <a key={l.href} href={l.href} className="inline-flex min-h-11 min-w-11 w-fit items-center">
            {l.label}
          </a>
        ))}
      </nav>
      <LegalLinks className="flex-col" />
      <div className="flex flex-col md:items-end">
        <a href={GMAIL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-fit items-center normal-case tracking-wider">
          {EMAIL}
          &nbsp;<Arrow />
          <span className="sr-only"> (opens Gmail in a new tab)</span>
        </a>
        <a href="#top" className="inline-flex min-h-11 w-fit items-center gap-2">
          Back to top <Arrow dir="up" />
        </a>
      </div>
      {/* who runs JIDO: the name comes from lib/legal.ts (a marked placeholder until it is filled in) */}
      <p data-operator className="col-span-full border-t border-slate-line pt-6 text-flag">
        JIDO. An AI automation platform developed and operated by <Ph k="operatorName" />.
      </p>
    </footer>
  );
}
