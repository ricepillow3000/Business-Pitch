# Privacy, legal and compliance: review pack

**Status: DRAFT. Not legally approved.** The pages are written and built into the website. They are not legal advice, and they must not be treated as approved until a qualified attorney has reviewed them and every placeholder is filled in. Every legal page shows a "Draft. Pending review by a qualified attorney. Not yet in effect." notice until `LEGAL_STATUS` in `lib/legal.ts` is cleared.

Prepared 2026-11-15 from the repository, the n8n workspace (read-only) and the project's own documentation. Nothing was deployed, no workflow was activated or run, no spreadsheet was opened and no customer data was sent anywhere.

---

## 1. What was verified, and what remains unknown

### Verified

| Area | Finding | How it was checked |
|---|---|---|
| Website framework | Next.js 16, static export (`output: "export"`). No server code, API routes, database or accounts. One contact form (below). | `next.config.ts`, `app/` |
| Contact form (`/contact`) | Sends name, email, business (optional), topic, message and the page it was sent from as JSON to the n8n webhook `jido-website-contact`. A hidden "website" field catches spam bots. If the webhook does not answer, the visitor is offered a Gmail draft instead. | `components/ContactForm.tsx`, `lib/site.ts` |
| Contact form workflow | n8n workflow `N1PRPdxPmwsQiKkI` "[TEST] JIDO Website - Contact Form", **inactive (not published)**. Validates the fields, drops spam, appends valid inquiries to a "Website Inquiries" Google Sheets tab (Time, Name, Email, Business, Topic, Message, Page, ID, Owner Alert), emails the owner with Gmail (reply-to = the visitor) and writes "Sent (Gmail message ...)" or "FAILED: ..." into Owner Alert. For testing it points at a **demo** sheet, "JIDO Website Inquiries (DEMO TESTS)", and alerts go to the site's contact address. Tested 2026-11-15 with 9 fictional submissions (every topic, a custom topic, no topic): all saved and emailed. Invalid and honeypot submissions were not saved or emailed. It uses the existing "Google Sheets account" and "Gmail account" credentials in n8n. CORS allows any origin (`*`) until the real domain is known. | n8n API, 2026-11-15 |
| Booking (`/book`) | Google Calendar appointment page, embedded only **after** the visitor clicks "Show available times" (nothing loads from Google before that). No booking link is set yet (`SITE.bookingUrl` is `null`), so the page currently offers a Gmail "discovery call request" instead. | `components/BookingEmbed.tsx`, `lib/site.ts` |
| Share image and icons | `public/og.png`, `app/icon.svg`, `app/apple-icon.png`, `app/manifest.json`. No third-party requests. The share image is only referenced once `SITE.url` (the real domain) is set. | `lib/site.ts`, `app/layout.tsx` |
| Cookies, analytics, tracking | None. No analytics, ad or tracking scripts. One `sessionStorage` item, `jido:intro`, that shortens the intro on repeat visits. | `package.json`, `lib/intro.ts`, page source |
| Fonts | Self-hosted from npm packages (`@fontsource-variable/archivo`, `@fontsource-variable/jetbrains-mono`). No Google Fonts requests. | `app/globals.css` |
| Outbound links | "Email" links open Gmail compose (`mail.google.com`) in a new tab when clicked. No other third-party requests. | `lib/contact.ts` |
| Hosting | Not deployed. Provider not chosen. | `README.md`, `docs/HANDOFF.md` (other branch) |
| Website chat | This website has no chat window. The n8n chat trigger is set to `public: false`. | n8n workflow `IdkNaVucRL092QrI` |
| n8n workflows | 5 workflows on n8n Cloud, all **inactive**: 1 Main Chat Agent, 2 Save Lead, 3 Check Availability, 4 Book Appointment, 5 Error Logger. | n8n API, 2026-11-15 |
| AI model | One Google Gemini node (`models/gemini-3-flash-preview`), **switched off**, no Gemini credential attached. OpenAI is not connected anywhere. | Workflow 1 JSON |
| Google Sheets | A "Google Sheets account" credential exists in n8n. The sheet link in Business Settings is still a placeholder (`REPLACE_WITH_YOUR_SHEET_ID`), so no real sheet is connected. | Workflow 1 JSON |
| Gmail, Google Calendar | Used by workflows 2, 4 and 5 (owner alerts, error alerts, availability, booking). Owner email is a placeholder (`owner@example.com`); calendar is `primary`. | Workflow 1 JSON, `docs/n8n-lead-agent-test-log.md` |
| Conversation memory | n8n Window Buffer Memory: last 20 messages, keyed `clientId:sessionId`, held in memory and lost when n8n restarts. | Workflow 1 JSON |
| Usage tracking | One row per reply in a `Usage Log` tab: time, client ID, conversation ID, turn, execution ID, run type, AI model, AI requests, tool calls, tools used, estimated tokens, estimated cost, execution counts. No names, emails or message text (tested). The Measure Usage step also keeps message lengths (numbers only) for up to 500 conversations in n8n workflow static data. | Workflow 1 JSON, test log |
| Lead records | `Leads` tab: Email, Name, Phone, Reason, Status, Qualification Notes, Conversation Summary, First Contact, Last Updated, Appointment Start/End, Calendar Event ID. | Test log |
| Error records | `Error Log` tab: Time, Workflow, Failed Step, Error, Execution Link; emailed to the agency. Error text can include customer details. | Test log, cost guide |
| AI instructions | Answer only from approved info; never invent availability; book only after explicit confirmation; never ask for card numbers, government IDs, passwords or medical records; say it is an AI if asked; hand off to a human on listed triggers; emergency rule. | Workflow 1 "Build AI Instructions" |
| Client separation | Designed per client: own copy of workflow 1, `clientId`, sheet, calendar, owner email, memory key. Tool workflows 2 to 4 are shared and use one Google login. | Cost guide section 7, workflow JSON |
| Testing so far | Pinned fake data only; no real service contacted, no email sent, no event created. | Test log |

### Unknown (needed before launch)

- Legal business name, entity type, business address and **where the business is based** (this decides which state laws apply).
- Where clients and their customers are located.
- Website hosting provider and its logging.
- n8n Cloud plan, **data region**, and how long it keeps execution data (the workflows do not override the defaults).
- Whether the Google account used is a consumer account or Google Workspace, and its admin settings.
- Which Gemini tier and Google Cloud project future keys will use; whether OpenAI will be used and under which data controls.
- Billing model, client contracts and any data processing agreement.
- How the chat window will be embedded on client sites, and what it stores in the browser.
- Whether customers will ever receive emails (currently only the owner is emailed).

---

## 2. Pages created

| Page | URL | File |
|---|---|---|
| Privacy policy (17 sections) | `/privacy` | `app/privacy/page.tsx` |
| Terms of service (20 sections) | `/terms` | `app/terms/page.tsx` |
| AI disclosure (6 sections, includes sensitive-information rules) | `/ai-disclosure` | `app/ai-disclosure/page.tsx` |
| Legal contact and privacy requests (4 sections) | `/legal-contact` | `app/legal-contact/page.tsx` |
| Shared layout (draft notice, dates, table of contents, sections) | | `components/LegalPage.tsx` |
| Services, Pricing, Book a call, Contact (site pages, not legal pages) | `/services`, `/pricing`, `/book`, `/contact` | `app/*/page.tsx` |
| Footer legal links | | `components/LegalLinks.tsx` |
| Placeholders, dates, draft status | | `lib/legal.ts` |

Healthcare and sensitive-information restrictions appear in the Privacy policy ("Sensitive and health information"), the AI disclosure ("Please keep sensitive information out") and the Terms ("Prohibited activities").

## 3. Navigation and footer changes

- Home page footer: a "Legal" navigation with Privacy, Terms, AI disclosure and Legal contact.
- Every legal page ends with the same four links (the current page is highlighted) and "Back to JIDO".
- On legal pages the HUD logo leads to `/` and "Contact" leads to `/#initiation`, which scrolls to the contact section.
- Each legal page has a table of contents: a sticky column on wide screens, a collapsible "On this page" list on phones.
- Footer links morph into the page title when clicked (shared element view transition) in browsers that support it.

## 4. Third-party services disclosed

n8n (n8n Cloud), Google Gemini API, OpenAI API (marked as possible future, not connected), Google Sheets, Gmail, Google Calendar, website hosting provider (placeholder), and Gmail compose links (Google's terms apply when a visitor uses them).

## 5. Data types disclosed

- **Website visitors:** email address, name if shown, contact details and message content they choose to send by email; hosting-provider technical logs (IP address, browser type, pages requested), if the host keeps them.
- **AI receptionist users (processed for clients):** name, email, phone (optional), reason for contact and answers to qualifying questions, appointment preferences and confirmed date/time, messages and anything shared in the chat, AI-written conversation summary.
- **Business clients:** business name, contact details, configuration (approved info, services, hours, rules), calendar and integration settings, account and billing information if applicable.
- **Technical and usage:** usage records (listed above), error records, n8n run history, system performance information.
- **Contact form senders:** name, email, business name (optional), topic, message, the page the form was sent from and the time; stored in the "Website Inquiries" sheet and the owner's Gmail once the workflow is published.
- **Booking (after the visitor opts in):** whatever Google's booking page collects; Google may set its own cookies once the calendar is shown.
- **Browser storage:** `jido:intro` in session storage; possible future chat conversation ID (to be confirmed).

## 6. Statements that need verification before publication

| Statement in the pages | Why it needs checking |
|---|---|
| Google's unpaid Gemini API terms let Google use submitted content to improve its products, with possible human review; paid terms differ. | Based on Google's Gemini API Additional Terms as generally understood. Re-read the current terms on the day of publication. |
| "Our providers are reached over secure (HTTPS) connections." | Standard for n8n Cloud and Google APIs; confirm for every connection, including the future chat embed and webhooks. |
| "While in development, the chat entry point is not public and all workflows are switched off." | True on 2026-11-15. Must be updated at launch. |
| "Usage records are designed to leave out names, email addresses and message text." | Verified in code and tests; confirm the conversation ID stays a random code in production. |
| "It is set up to tell you that it is an AI." | It is an instruction to the AI; the live model's behaviour has not been tested. Consider an automatic disclosure in the first message instead. |
| "A team member will follow up." | Depends on each client staffing the handoff. |
| "We test each new client setup with a test conversation." | A process promise. Make sure it is done every time. |
| "We do not sell personal information, and we do not use it for advertising." | A business commitment. Confirm it is true and will stay true. |
| "Not directed at children under 13." | Confirm, especially for clients serving families (the dental demo mentions children as patients). |
| Children / international / retention wording | Confirm with counsel once location and providers are final. |
| Terms: limitation of liability, indemnification, dispute resolution | Marked "Drafted for attorney review" on the page. |

The pages make **no** claim of HIPAA, GDPR, CCPA/CPRA, SOC 2 or ISO 27001 compliance, encryption at rest, certifications or audits. The Privacy policy states that the platform is **not** HIPAA compliant and that no independent audit has been done. The automated tests fail if wording such as "HIPAA compliant", "GDPR compliant", "SOC 2 certified" or "we never share" appears (except "not HIPAA compliant").

## 7. Placeholders still to fill in (`lib/legal.ts`)

| Key | Placeholder shown on the pages |
|---|---|
| `businessName` | [Legal business name] |
| `mailingAddress` | [Business mailing address] |
| `privacyEmail` | [Privacy contact email] |
| `generalEmail` | [General contact email] |
| `jurisdiction` | [Governing jurisdiction] |
| `hostingProvider` | [Website hosting provider] |
| `effectiveDate` | [Effective date] |

Also: clear `LEGAL_STATUS` only after attorney approval, and update `LAST_UPDATED` whenever the text changes. Note that the website's existing contact address (`lib/contact.ts`) is a personal Gmail address; decide whether the legal pages should use it or a dedicated business address.

## 8. Missing privacy and security features in the automation

1. **No retention schedule** and no automated deletion for the Leads, Usage Log and Error Log tabs.
2. **n8n execution data** (which can include full conversations) is kept under default settings. Configure "save execution data" and pruning per workflow and confirm the plan's retention.
3. **No process or tooling for privacy requests:** finding and deleting one person across Sheets, Calendar events, Gmail notifications and n8n executions.
4. **Shared Google login and shared tool workflows** across clients. A wrong sheet link would mix clients' customers. Per-client credentials (or per-client copies of workflows 2 to 4) are safer.
5. **Error alerts can contain customer details** in email. Consider redacting before sending.
6. **AI disclosure only on request.** Several US states have chatbot disclosure laws. A short automatic disclosure in the first chat message, with a link to the AI disclosure page, is the safer default.
7. **No sensitive-data filter.** The AI is told not to ask for card numbers or medical details, but nothing stops a customer typing them. Consider detecting and redacting obvious patterns (card numbers, SSNs) before saving.
8. **Conversation memory** is in-memory for the demo. A production database memory needs its own retention and deletion rules.
9. **Unpaid Gemini tier** must never see real data. Enforce with a billing-enabled project and key per client before launch.
10. **Account security not verified:** two-step verification on Google, n8n and hosting accounts; access reviews; least-privilege sharing of client calendars and sheets.
11. **No incident response or breach notification plan.**
12. **Website hosting:** once deployed, enable HTTPS and security headers (HSTS, CSP), and confirm what the host logs.
13. **No customer-facing notice inside the chat window** linking to the client's privacy notice.
14. **No Business Associate Agreements** and no verified HIPAA-eligible configuration for any provider. Healthcare clients cannot go live until this is resolved.

## 9. Laws and frameworks that may apply (for counsel to confirm)

Which apply depends on where JIDO is based, where clients and their customers are, revenue and data volume, and the industries served. None of these are claimed as met.

- **FTC Act Section 5** (US): privacy statements and AI claims must be accurate.
- **State comprehensive privacy laws** (for example California CCPA/CPRA and similar laws in other states): thresholds may not be met today; obligations can still arise as a service provider to clients that are covered.
- **State chatbot and AI disclosure laws** (for example California's bot disclosure law, Utah's AI Policy Act, Colorado's AI Act).
- **State consumer health data laws** (for example Washington's My Health My Data Act), which can cover dental information even outside HIPAA.
- **HIPAA:** dental practices are typically covered entities; a vendor handling their patient information is typically a business associate. Requires BAAs and eligible services.
- **State data breach notification laws** (all 50 states).
- **COPPA**, if any service could collect information from children under 13.
- **CAN-SPAM**, and **TCPA** if calls or texts are added later.
- **GDPR / UK GDPR**, if clients or customers are in the EU or UK.
- **Accessibility (ADA)** expectations for the website and the chat window.

## 10. Pre-launch checklist

- [ ] Attorney review of all four pages; resolve every item in section 6.
- [ ] Fill in every placeholder in `lib/legal.ts`; set the effective date; clear `LEGAL_STATUS`.
- [ ] Decide and document retention periods (proposal below); configure n8n execution data pruning.
- [ ] Move off the unpaid Gemini tier (paid Gemini or OpenAI with reviewed data terms) before any real data.
- [ ] Per-client sheet, calendar, owner email and, ideally, credentials; run the "new client" checklist and a test chat for each client.
- [ ] Add an automatic AI disclosure to the first chat message, with links to the client's privacy notice and the AI disclosure page.
- [ ] Write a privacy request procedure (identity check, where to search, how to delete, response tracking).
- [ ] Enable two-step verification on every account; restrict access; document who can see client data.
- [ ] Incident response and breach notification plan.
- [ ] Client agreement with data processing terms (roles, instructions, sub-processors, deletion at end of contract).
- [ ] Confirm the hosting provider, enable HTTPS and security headers, and update the Privacy policy with the host.
- [ ] Describe exactly what the chat window stores in the browser.
- [ ] Healthcare clients: separate compliance assessment, BAAs and eligible services, or do not onboard.
- [ ] Contact form: replace the demo sheet with the real inquiries sheet in "Form Settings" (and delete the demo rows), confirm the owner email, set CORS to the real domain, test with the Test URL, then publish **only with the owner's approval**.
- [ ] Booking: create the Google Calendar appointment schedule and paste its link into `SITE.bookingUrl`.
- [ ] Set `SITE.url` to the real domain (adds canonical links and the share image).
- [ ] Update `LAST_UPDATED` and re-run `node tests/verify.cjs`.

### Proposed retention policy (a business decision, not yet adopted)

| Record | Suggested period |
|---|---|
| Leads (non-customers) | Delete 12 months after last contact, unless the client instructs otherwise |
| Leads that became appointments | Follow the client's own record-keeping rules; remove from our systems at the end of the contract |
| Usage Log | 13 months (enough for yearly cost comparisons), then delete |
| Error Log and error alert emails | 90 days |
| n8n execution data | Successful runs: 7 days. Failed runs: 30 days |
| Conversation memory | End of conversation, or 24 hours at most |
| Emails from website visitors | 24 months after the last message, unless they became clients |
| All client data at contract end | Return or delete within 30 days, subject to legal holds |

## 11. Recommendations for attorney review

Ask counsel to:

1. Confirm the governing law and venue, and which state privacy, AI disclosure and health data laws apply.
2. Review the controller / service provider split in "Who we are and our roles" and draft a client data processing agreement to match.
3. Finish the limitation of liability, indemnification and dispute resolution clauses.
4. Confirm the AI disclosure wording meets applicable chatbot disclosure laws, and whether disclosure must be automatic.
5. Advise on HIPAA and state health data law exposure for dental and other healthcare clients, including BAA requirements for n8n, Google and the AI provider.
6. Confirm the children's privacy position.
7. Approve the retention schedule.
8. Confirm the unpaid / paid Gemini wording against the current Google terms.
9. Review the breach notification plan.
