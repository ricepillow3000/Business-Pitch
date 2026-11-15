/**
 * Business details used by the legal pages. FILL THESE IN BEFORE PUBLISHING.
 * While a value is null, the pages show a clearly marked [placeholder] instead
 * of inventing anything. See docs/legal/LEGAL-REVIEW.md for the full checklist.
 */
export const LEGAL = {
  operatorName: "John Nguyen" as string | null, // the legal name of the person who develops and operates JIDO (shown in the footer)
  businessName: null as string | null, // e.g. "JIDO LLC"
  mailingAddress: null as string | null,
  privacyEmail: null as string | null,
  generalEmail: null as string | null,
  jurisdiction: null as string | null, // e.g. "the State of ___, United States"
  hostingProvider: null as string | null, // the company that will host this website
  effectiveDate: null as string | null, // the date the approved policies take effect
};

export type LegalKey = keyof typeof LEGAL;

export const PLACEHOLDER: Record<LegalKey, string> = {
  operatorName: "Operator's legal name",
  businessName: "Legal business name",
  mailingAddress: "Business mailing address",
  privacyEmail: "Privacy contact email",
  generalEmail: "General contact email",
  jurisdiction: "Governing jurisdiction",
  hostingProvider: "Website hosting provider",
  effectiveDate: "Effective date",
};

export const LAST_UPDATED = "November 15, 2026";

/** Shown on every legal page until an attorney has reviewed them. Set to "" once approved. */
export const LEGAL_STATUS = "Draft. Pending review by a qualified attorney. Not yet in effect.";

/** The legal pages, in footer order. `vt` names the shared-element view transition. */
export const LEGAL_PAGES = [
  { href: "/privacy", label: "Privacy", title: "Privacy policy.", vt: "legal-privacy" },
  { href: "/terms", label: "Terms", title: "Terms of service.", vt: "legal-terms" },
  { href: "/ai-disclosure", label: "AI disclosure", title: "AI disclosure.", vt: "legal-ai" },
  { href: "/legal-contact", label: "Legal contact", title: "Legal contact.", vt: "legal-contact" },
] as const;

export type LegalHref = (typeof LEGAL_PAGES)[number]["href"];
