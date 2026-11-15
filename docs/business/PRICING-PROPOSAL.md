# Pricing and offer definitions: proposal for discussion

**Status: proposal. Not published, not agreed.** Prices, limits and terms below are suggestions to decide on before anything goes on the website. Cost figures come from `docs/n8n-cost-and-migration-guide.md` (other branch), which itself relies on unverified third-party price reports. Re-check every provider price on the day you set prices.

## 1. What has actually been tested (so the website does not over-promise)

| Capability | State today | Safe to advertise? |
|---|---|---|
| Lead capture into a sheet, duplicate-safe | Built; tested with fake data only | "Being piloted", not "proven" |
| Availability check on Google Calendar | Built; tested with fake data only | Same |
| Booking after customer confirmation | Built; tested with fake data only | Same |
| Owner email alerts, human handoff | Built; tested with fake data only | Same |
| Error alerts | Built; cannot fire until published | Same |
| AI conversation quality (follows rules, picks tools) | **Not tested with a live model** | No |
| Website chat window on a client site | **Not built / not embedded** | No |
| CRM integrations | **Not built** | No, quote only |
| Voice agents | **Not built** | No, quote only |
| Usage tracking per client | Built; tested with fake data | Internal only |

Recommendation: run one live pilot (test Google account, fictional customers, paid AI tier or the free tier with fake data only) before publishing prices or the words "AI receptionist" as a ready product.

## 2. Your costs per client (rough)

- **n8n:** about 6 billed executions per customer conversation (tool runs are free sub-workflows). One n8n Cloud account serving all clients: Starter plan about 2,500 executions (about $24), Pro about 10,000 (about $60). Above that, Business plan or self-hosting.
- **AI:** about $0.01 to $0.04 per conversation on paid tiers (GPT nano/mini or Gemini Flash).
- **Google Sheets, Gmail, Calendar:** $0 on the client's own Google account; Google Workspace if the client uses it (their cost).
- **Your time:** setup, changes and support are the real cost. Price them.

Example: a Starter client with 300 conversations a month uses about 1,800 executions and about $3 to $12 of AI.

## 3. Proposed definitions

### Starter: $399+ setup, $199 per month
- **Includes (pick one):** one simple automation (one trigger, up to 3 steps, e.g. form to sheet to owner email) **or** one website chatbot answering from approved information and capturing leads. **No booking** in Starter.
- **Usage limit:** up to 300 chatbot conversations or 2,000 automation runs per month.
- **Integrations:** up to 2 (for example Google Sheets and Gmail).
- **Support:** email, reply within 2 business days; up to 1 hour of small changes per month.
- **Monitoring:** error alerts to us; fixes for our own workflow faults at no charge.
- **"+" on setup means:** more than 1 page of approved information, custom branding of the chat window, or data migration is quoted extra.

### Growth: $799+ setup, $399 per month
- **Includes:** AI receptionist with lead qualification, **plus one of** Google Calendar scheduling **or** one CRM integration (CRM only once built and tested), owner notifications, human handoff, monitoring, monthly usage report.
- **Usage limit:** up to 1,000 conversations per month.
- **Support:** email, reply within 1 business day; up to 2 hours of changes per month; quarterly review call.

### Custom: quote after discovery
- Voice agents, custom integrations, multi-location, higher volumes, or anything not yet built. Always a written scope (statement of work) with its own price, timeline and acceptance tests.

## 4. Decisions to make before publishing

| Topic | Suggestion |
|---|---|
| **Usage above the limit** | Notify at 80%. Above 100%: either $25 per extra 100 conversations, or pause and offer an upgrade. Never silently overcharge. |
| **Third-party API fees** | Included up to the usage limit (they are small). For Growth and Custom, prefer **client-owned API keys and accounts** (the client pays the provider directly). This also keeps each client's data separate, as the legal review recommends. |
| **Client ownership** | The client owns its data (sheets, calendars, leads, conversations) and its accounts. JIDO owns its workflow templates, prompts and code, licensed to the client while subscribed. Optional buy-out of a custom workflow, priced separately. |
| **Cancellation** | Month to month after setup; 30 days' notice. Setup fee non-refundable once build work starts (or refundable before kickoff). On cancellation: export of the client's data within 30 days, then deletion from our systems. |
| **Minimum term** | None for Starter; consider 3 months for Growth to cover setup effort. |
| **Healthcare clients** | Not offered until the HIPAA / health-data assessment and BAAs are done (see `docs/legal/LEGAL-REVIEW.md`). The dental office is a demo only. |
| **Taxes** | Check whether your state taxes software or digital services. |
| **Guarantees** | Do not promise results (leads, bookings, revenue). |

## 5. How prices could appear on the website

Your own "no AI slop" list includes **"3 pricing tiers"**. Options:
1. **No public prices yet** (recommended until the pilot is done): a "How we work" section and a discovery call.
2. **"From" prices in plain text:** "Setup from $399. Plans from $199 a month. Every project starts with a discovery call." No tier cards.
3. **Three tiers** as proposed. Conflicts with the no-slop rule, and the automated scan would need an exception.

All prices need matching terms (usage, support, cancellation) in a client agreement before they are shown.
