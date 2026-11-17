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
   * Google Calendar appointment schedule for discovery calls, shown as the week calendar on /book.
   * In Google Calendar: open the appointment schedule → Share → Website embed → Inline → Copy,
   * then paste its https://calendar.google.com/calendar/appointments/schedules/… address here
   * (pasting the whole <iframe …> code also works: wrap it in `backticks`).
   * Opening hours, busy times and days off are all set inside Google Calendar.
   * While null, /book shows an empty week saying online booking opens soon.
   */
  /**
   * Days with no discovery calls, shown greyed out on the /book week before the live calendar loads.
   * Keep in step with the appointment schedule's hours in Google Calendar (Google's calendar is the
   * one that decides what can actually be booked).
   */
  bookingDaysOff: ["Thu", "Sat", "Sun"] as string[],

  bookingUrl: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ2bQ37qEV638kId5nZ06uV1wSsIFSkd4-pjchDDv7SUFrKZDbzvjG1aKTgPAn_yJLP-AwcbN1l9" as string | null,

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
