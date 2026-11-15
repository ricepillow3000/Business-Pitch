/**
 * Site settings for the launch pages. FILL IN / UPDATE BEFORE PUBLISHING.
 */
export const SITE = {
  /**
   * The public address, e.g. "https://jido.ai", once the domain is owned and the site is live.
   * While null, pages still get titles, descriptions and Open Graph / Twitter tags, but no
   * canonical link or share image (both need a full https:// address).
   */
  url: null as string | null,

  /**
   * Google Calendar appointment schedule link for discovery calls
   * (Google Calendar → Create → Appointment schedule → Share → Booking page link).
   * While null, /book offers an email request instead.
   */
  bookingUrl: null as string | null,

  /**
   * n8n webhook that receives the contact form (workflow "[TEST] JIDO Website - Contact Form").
   * While null, or while that workflow is not published, the form shows its email fallback.
   */
  contactEndpoint: "https://jido-api.app.n8n.cloud/webhook/jido-website-contact" as string | null,

  /** "From" prices, shown as plain text (no tier cards). Exact scope is agreed in writing. */
  prices: { setupFrom: 399, monthlyFrom: 199 },
};

/** Main navigation, shared by the HUD (wide screens) and the footer. */
export const NAV = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/book", label: "Book a call" },
  { href: "/contact", label: "Contact" },
] as const;

/** Titles + descriptions for search results and link previews (one per page, all different). */
export function pageMeta(title: string, description: string, path = "/") {
  return {
    title,
    description,
    ...(SITE.url ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: "website" as const,
      siteName: "JIDO",
      locale: "en_US",
      title,
      description,
      ...(SITE.url ? { url: path, images: [{ url: "/og.png", width: 1200, height: 630, alt: "JIDO: intelligent workflows for local businesses" }] } : {}),
    },
    twitter: { card: SITE.url ? ("summary_large_image" as const) : ("summary" as const), title, description },
  };
}
