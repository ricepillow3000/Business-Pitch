/**
 * Single source of truth for brand + copy.
 * Swap BRAND.name and the whole site (loader included) follows.
 */
export const BRAND = {
  name: "JIDO",
  tagline: "Autonomous Operations",
  email: "hello@jido.agency", // TODO: real address/domain
  cta: "Book a 20-min audit",
};

/** The five agent "units". */
export const AGENTS = [
  {
    code: "U-01",
    name: "Receptionist",
    line: "Answers every call, text and DM in under 3 seconds — 24/7.",
    input: "Calls · SMS · Web chat · Instagram",
    action: "Answers FAQs, qualifies, routes urgent to you",
    output: "Logged lead + summary in your CRM",
  },
  {
    code: "U-02",
    name: "Scheduler",
    line: "Books, reschedules and chases no-shows without a human touch.",
    input: "Inbound requests · Calendar",
    action: "Finds slots, confirms, sends reminders",
    output: "A full calendar, fewer empty chairs",
  },
  {
    code: "U-03",
    name: "Collector",
    line: "Sends invoices, follows up politely, and reconciles payments.",
    input: "Jobs completed · Accounting app",
    action: "Invoices, nudges on day 3/7/14",
    output: "Paid invoices, matched in the books",
  },
  {
    code: "U-04",
    name: "Reputation",
    line: "Asks happy customers for reviews at exactly the right moment.",
    input: "Completed visits · Feedback",
    action: "Requests reviews, drafts replies",
    output: "More 5-star reviews, faster",
  },
  {
    code: "U-05",
    name: "Data Clerk",
    line: "Moves information between your apps so nobody re-types anything.",
    input: "Forms · Email · PDFs · Spreadsheets",
    action: "Extracts, cleans, syncs",
    output: "One clean record everywhere",
  },
] as const;

/** The repetitive tasks we strike through on scroll. */
export const BUSYWORK = [
  "Answering the same five questions",
  "Calling back missed calls",
  "Re-typing forms into the CRM",
  "Chasing unpaid invoices",
  "Reminding no-shows",
  "Begging for reviews",
];

export const PROCESS = [
  { n: "01", t: "Diagnose", d: "A 20-minute call and a look at your week. We map every repetitive task and price what it costs you." },
  { n: "02", t: "Build", d: "We design the agents around the tools you already use. No new software for your team to learn." },
  { n: "03", t: "Deploy", d: "Agents go live in a sandbox first, then on real customers once you have signed off on every reply." },
  { n: "04", t: "Monitor", d: "We watch every conversation, tune weekly, and send you a plain-English report of hours saved." },
];

export const FAQ = [
  { q: "Will it sound like a robot?", a: "No. Agents are trained on how you actually talk to customers, and you approve the tone before launch." },
  { q: "Do I need to change my software?", a: "Almost never. We plug into the calendar, CRM, phone and accounting tools you already pay for." },
  { q: "What if it gets something wrong?", a: "Anything uncertain is escalated to a human instantly, and every action is logged so you can see exactly what happened." },
  { q: "What does it cost?", a: "Fixed monthly pricing, scoped on the audit call. Most clients pick one agent to start and add more once it pays for itself." },
];

/** TODO: PLACEHOLDER pricing for design review — replace with real numbers before launch. */
export const PLANS = [
  { code: "P-01", name: "Single Unit", price: "$—", unit: "/mo", units: 1, blurb: "One agent, one job, done perfectly. The fastest way to see it pay off.", features: ["1 agent of your choice", "Connects to 2 of your tools", "Weekly tuning", "Plain-English monthly report"] },
  { code: "P-02", name: "Squad", price: "$—", unit: "/mo", units: 3, featured: true, blurb: "Three agents sharing one memory. Calls become bookings become invoices.", features: ["3 agents, shared memory", "Unlimited tool connections", "Priority human escalation", "Fortnightly strategy call"] },
  { code: "P-03", name: "Full Brain", price: "$—", unit: "/mo", units: 5, blurb: "The whole back office, automated. For multi-location and high-volume teams.", features: ["All 5 agents", "Custom workflows", "Dedicated engineer", "Same-day changes"] },
] as const;

/**
 * INFO PANELS — opened by clicking the orb ("core") or the storm ("engine") in the hero.
 * Drafted copy; edit freely.
 */
export const INFO = {
  core: {
    code: "SYS-01",
    title: "The JIDO Core",
    hotspot: "The core",
    body: "One AI brain shared by every agent you hire. It learns your business, your tone and your rules, so every call, booking and invoice sounds like you.",
    bullets: ["Trained on how you actually talk to customers", "One memory shared by every agent", "You approve the rules before anything goes live"],
  },
  engine: {
    code: "SYS-02",
    title: "The Workflow Engine",
    hotspot: "The engine",
    body: "Calls, bookings, invoices and follow-ups get pulled in, handled and sent back out, around the clock. You only see what needs a human.",
    bullets: ["Runs 24/7, no breaks, no missed calls", "Plugs into the tools you already pay for", "Anything uncertain goes straight to you"],
  },
} as const;
