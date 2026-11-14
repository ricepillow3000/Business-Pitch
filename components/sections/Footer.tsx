import { BRAND } from "@/lib/config";
import { TransitionLink } from "@/components/transition/TransitionLink";

/** Beige colour-block footer with a cropped mega wordmark — poster bottom edge. */
export function Footer() {
  return (
    <footer data-section="08 // End of line" className="relative z-10 overflow-hidden bg-beige text-flag">
      <div className="poster-grid gap-y-10 pb-6 pt-16">
        <div className="col-span-12 md:col-span-4">
          <p className="font-label">Contact</p>
          <a href={`mailto:${BRAND.email}`} className="mt-3 block font-poster text-h3">{BRAND.email}</a>
        </div>
        <div className="col-span-6 md:col-span-2 md:col-start-7">
          <p className="font-label">Site</p>
          <ul className="mt-3 space-y-1 font-body">
            <li><TransitionLink href="/#agents">Agents</TransitionLink></li>
            <li><TransitionLink href="/pricing">Pricing</TransitionLink></li>
            <li><TransitionLink href="/booking">Book an audit</TransitionLink></li>
          </ul>
        </div>
        <div className="col-span-6 md:col-span-3">
          <p className="font-label">Status</p>
          <p className="mt-3 font-body">All units online.<br />© {new Date().getFullYear()} {BRAND.name}</p>
        </div>
      </div>
      <div className="hazard h-2 text-flag/80" aria-hidden />
      <p className="select-none whitespace-nowrap px-2 font-poster text-[26vw] leading-[0.74] tracking-[-0.06em]" aria-hidden>
        {BRAND.name}
      </p>
    </footer>
  );
}
