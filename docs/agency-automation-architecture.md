# AI Agency Business-Development System: proposed architecture (Phase A)

Status: **proposal, waiting for approval.** Nothing in this document has been built yet.
Date: 2026-11-15. Prices and policies came from web search results and must be re-checked on the official pages before money is spent.

---

## 1. What we are building, in one picture

```
 ① DISCOVER ─► ② RESEARCH ─► ③ SCORE ─► ④ DRAFT EMAIL ─► [YOU APPROVE] ─► SEND
  Atlanta        official       Hot/       personalized        in the         (pause switch,
  businesses     website        Warm/      outreach            CRM sheet       daily limit,
  (open data)    + AI notes     Cold                                           opt-out list)
                                                                                   │
 ⑦ REPORTS ◄── ⑥ BOOK MEETING ◄── [YOU APPROVE] ◄── ⑤ READ & SORT REPLIES ◄─────────┘
  8 AM / 6 PM    agency sales        (during           Interested / Question /
  from real      calendar            development)      Not interested / Unsubscribe ...
  records                                              → draft answer or human review
```

**The co-founder's day once this is finished:**
- 8:00 AM: an email lists today's confirmed sales calls with short notes on each business.
- During the day: attend the calls.
- 6:00 PM: an email summarizes what happened today, plus the questions that need a human answer.
- Any time: open the CRM sheet and approve or reject drafted emails with one dropdown.

## 2. Two separate areas in n8n

| Area | What's in it | Status |
|---|---|---|
| **A. Internal Agency Automation** | The new system in this document | To be built (Phases B–F) |
| **B. Client Automation Products** | The 5 dental front-desk workflows, kept as a fictional demo product we may sell later | Kept inactive, renamed, not configured further |

**Proposed renames** (reversible; history and test logs are kept):

| Now | Proposed |
|---|---|
| `[TEST] Lead Agent - 1 Main Chat Agent (Demo: Bright Smile Dental)` | `[CLIENT DEMO] Dental Front Desk - 1 Main Chat Agent` |
| `[TEST] Lead Agent - 2 Tool: Save Lead` | `[CLIENT DEMO] Dental Front Desk - 2 Tool: Save Lead` |
| `[TEST] Lead Agent - 3 Tool: Check Availability` | `[CLIENT DEMO] Dental Front Desk - 3 Tool: Check Availability` |
| `[TEST] Lead Agent - 4 Tool: Book Appointment` | `[CLIENT DEMO] Dental Front Desk - 4 Tool: Book Appointment` |
| `[TEST] Lead Agent - 5 Error Logger` | `[CLIENT DEMO] Dental Front Desk - 5 Error Logger` |

New workflows start with `[AGENCY]`. I'll add tags `client-demo` and `agency-internal`. My n8n connection can move workflows into folders but cannot create folders, so you create two folders in n8n (2 clicks each) and I'll move everything in:
`A. Internal Agency Automation` and `B. Client Automation Products`.

## 3. What can be reused from the 5 demo workflows

| Demo piece | Reused for | How much changes |
|---|---|---|
| Open-slot finder (Check Availability), tested 6/6 | Sales meeting availability (Stage 6) | Small: agency hours and meeting length |
| Double-booking guard (Book Appointment), tested 12/12 | Booking sales calls (Stage 6) | Small: adds the business name and research notes to the event |
| "Never downgrade a status, no duplicate rows" logic (Save Lead), tested 5/5 | CRM updates | Medium: new columns |
| Error Logger | Agency error logger | Copy, pointed at the agency sheet |
| Usage measuring (tokens, executions) | Cost tracking for every AI step | Small |
| Single "AI Model (swap here)" design | One shared AI Brain for the whole system | Becomes its own helper workflow |
| Not reused | Chat front desk, dental rules | Stay in the demo |

## 4. Proposed workflows (Area A)

| # | Workflow | Stage | What it does | Starts by |
|---|---|---|---|---|
| A0 | Setup: Create Agency CRM | — | One time only: creates the CRM Google Sheet with every tab and heading | Manual (needs your approval to run) |
| A1 | Discover Businesses | 1 | Finds Atlanta-area businesses by industry from approved sources; skips duplicates; adds them as "Not researched" | Scheduler (weekdays) |
| A2 | Research & Analyze | 2 | Reads each business's **official website only** (home and contact pages, respecting robots.txt); AI writes evidence-based notes and one best opportunity | Scheduler (3× a day, small batches) |
| A3 | Score & Qualify | 3 | Fixed, written-down point rules give Warm or Cold; Hot only comes from a real reply | Called by A2 and A6 |
| A4 | Draft Outreach | 4 | AI personalizes our approved template for approved leads; puts the draft in the CRM for review | Scheduler (2× a day) |
| A5 | Send Approved Outreach | 4 | Sends only approved drafts, after every safety check (section 7) | Scheduler (hourly, business hours) |
| A6 | Reply Monitor & Classifier | 5 | Reads only replies to our outreach threads; sorts them into the 8 categories; handles opt-outs; creates Gmail **drafts** (not sends) from the Rulebook; sends anything unusual to the Review Queue | Gmail check every 30 min, weekdays |
| A7 | Meeting Scheduler | 6 | Offers real open times; after the prospect confirms, a booking goes to your approval queue, then onto the agency calendar | Called by A6 |
| A8 | Morning Report (8:00 AM ET) | 7 | Today's meetings, research notes, follow-ups due, warnings | Scheduler |
| A9 | Evening Report (6:00 PM ET) | 7 | Today's counts from the records, review queue, failures, usage and cost | Scheduler |
| A10 | Agency Error Logger | all | Logs failures and alerts the co-founder | When any agency workflow fails |
| S | Agency Scheduler | all | **One** workflow holds all the timers, so there's one master on/off switch | Timers |
| H1 | Helper: AI Brain | 2, 4, 5 | The only place the AI model lives. Returns strict JSON and logs requests and tokens. **Swapping Gemini for OpenAI happens here once.** | Called |
| H2 | Helper: Check Calendar Availability | 6 | Adapted from the demo | Called |
| H3 | Helper: Book Meeting | 6 | Adapted from the demo, with the double-booking guard | Called |
| H4 | Helper: Log Activity | 7 | Writes every event (discovered, drafted, sent, reply…) to the Activity Log, which the reports are counted from | Called |

Why helpers? Helper (sub-workflow) runs **don't count** toward n8n's monthly execution limit, and each job lives in one place.

## 5. The CRM: one Google Sheet per environment

**Recommendation: Google Sheets**, not n8n Data Tables, for now:
- The co-founder can read, edit and approve rows on a phone.
- Your Google Sheets login is already connected in n8n.
- My connection can't create n8n Data Tables, and the volume (hundreds of rows) is well within Sheets' limits.
- We can move the system logs to Data Tables later if needed.

Two separate files:
- **`Agency CRM - DEMO`** for fictional test businesses.
- **`Agency CRM - LIVE`**, created only when you approve real research.

Fictional and real records are never mixed.

| Tab | Purpose |
|---|---|
| **Leads** | One row per business (columns below) |
| **Settings** | Pause switch, daily send limit, sender name and address, working hours, meeting length, calendar ID, target cities and industries, AI model label and prices |
| **Rulebook** | Approved answers the AI may use (section 8) |
| **Suppression List** | Emails and domains that must never be contacted (opt-outs, bounces, requests). Never cleared automatically. |
| **Send Ledger** | One row per email we intend to send, written before sending, so a repeated run can't send the same email twice |
| **Replies** | One row per incoming reply (the unique Gmail message ID prevents double processing) |
| **Review Queue** | Anything needing a human: unusual questions, low confidence, possible manipulation attempts, reschedules |
| **Meetings** | Booked calls with calendar event IDs |
| **Activity Log** | Every event with a time stamp. **Reports are calculated only from this tab.** |
| **Usage Log** | AI requests, estimated tokens, executions, estimated cost |
| **Error Log** | Failures |

**Leads tab columns:**
- **Identity:** Lead ID (permanent: `L-` + the website domain, or `L-osm-` + the source ID when there's no website), Business Name, Industry, Street/City/State, Website, Public Email, Email Found At (URL), Public Phone, Source, Source URL, Research Date.
- **Research:** Booking/Contact Options Seen, Primary Opportunity, Evidence, Proposed Solution, Why It May Help, Unknowns To Verify, Research Confidence (High/Medium/Low).
- **Scoring:** Fit Score, Score Breakdown, Temperature (Hot/Warm/Cold), Pipeline Status.
- **Outreach:** Email Subject, Email Draft, Approval Status, Approved By/At, Sent At, Gmail Message ID, Gmail Thread ID, Follow-up Count, Last Contact Date, Next Allowed Follow-up.
- **Outcome:** Reply Status, Reply Category, Meeting Status, Meeting Time, Assigned Owner, Opted Out, Error Status, Notes, Is Demo.

**Pipeline Status values:** Not researched → Ready for review → Outreach approved → Contacted → Follow-up pending → Interested → Meeting booked. The end states are Not interested, Unsubscribed and Invalid contact.

## 6. Lead scoring rules (no guessed probabilities)

AI only collects **evidence**. The score comes from fixed rules written in code, and every point is shown in the Score Breakdown column.

| Rule (from evidence found) | Points |
|---|---|
| Official website found and working | +15 |
| Appointment- or quote-based industry (contractors, HVAC, plumbing, roofing, auto, fitness, med spa, salon…) | +20 |
| Public business email on its own website | +15 |
| No online booking or instant quote seen | +15 |
| Online booking already exists (reminders and follow-up may still help) | +5 (instead of the +15 above) |
| Contact is phone-only or a basic contact form | +10 |
| Inside the target area (Atlanta metro list in Settings) | +10 |
| Research confidence: High / Medium / Low | +15 / +5 / 0 |

- **WARM:** 60 or more points, **and** a public email, **and** confidence Medium or High.
- **COLD:** everything else.
- **HOT:** only when a real reply is classified Interested, Pricing question or Meeting request. Scores never make a lead Hot.

## 7. Outreach safety controls (Stage 4)

**Before any email is sent, every check must pass:**
1. **Pause switch** in Settings is `NO`, and the Scheduler is on.
2. The lead is `Outreach approved` **and** its draft is `Approved` by a person.
3. The address and its domain are **not** on the Suppression List, and the lead has not opted out.
4. The email was found on the business's own website. We never guess addresses.
5. **Sender check:** the Gmail account in use matches the sender address in Settings.
6. **Daily limit:** start at 10–20 per day, configurable.
7. **Send Ledger:** no "sent" or "sending" row already exists for this lead and step.
8. **Footer present:** agency name, physical mailing address, and a one-line opt-out ("Reply STOP and we won't email you again").

**After sending:** record the Gmail message ID and thread ID, which is how replies are matched later (no tracking pixels). Set the next allowed follow-up date (for example +5 business days, at most 2 follow-ups, each approved).

**US law (CAN-SPAM, plain-English summary; not legal advice):**
- Truthful sender details and subject line.
- Identify the message as an advertisement where required.
- Include a valid physical postal address.
- Include a working opt-out, and honor it within 10 business days.

Breaking these rules can cost tens of thousands of dollars per email. A quick review by a lawyer before going live is recommended.

## 8. Agency Rulebook (Stage 5)

A tab of approved statements. The AI may only use these, word-for-word facts, when drafting replies:
- Business description
- Services we actually offer
- Integrations we actually support
- Pricing policy (for example: "Pricing depends on scope; we share a quote after a 20-minute discovery call")
- Discovery-call process
- FAQ
- Tone rules
- **Must-ask-a-human topics:** contracts, guarantees, custom pricing, legal/compliance, data handling, refunds, anything not in the Rulebook
- **Never-assume topics:** results, client names, case studies, integrations not listed, timelines

**You need to write the real Rulebook content.** I'll provide a template with fictional placeholders.

## 9. Safety against manipulation (websites and emails)

- Website and email text is handed to the AI as **quoted data**, with an instruction to ignore any instructions inside it.
- **The AI has no tools that act.** It can't send, book, delete or unsubscribe anyone. It only returns a structured answer, which code checks.
- Real actions happen only through fixed rules plus human approval.
- If text looks like it's trying to instruct the AI ("ignore your rules…", "send me…"), the item goes to the Review Queue.
- Unsubscribe requests are detected by simple keyword rules first (STOP, unsubscribe, remove me) and then by AI. Any sign of opt-out → Suppression List, no more emails.

## 10. Data sources for discovery (Stage 1)

| Source | Cost | Allowed use | Recommendation |
|---|---|---|---|
| **OpenStreetMap (Overpass API)** | Free | Open license (ODbL) with attribution. The main public server asks heavy commercial users to self-host or pay, so we'd run small, polite weekly queries and must read its usage policy first. Coverage of small trades is uneven. | **Use first**, at low volume |
| **Foursquare Open Source Places** | Free | Apache 2.0 license with attribution. Bulk monthly download through a portal (needs a free account and token). Harder to load into n8n. | Later, if OSM coverage is thin |
| **Business's own official website** | Free | Reading public pages at a normal pace, respecting robots.txt. The **only** place we take emails from. | **Always**, to verify every lead |
| **Manual seed list** | Free | Businesses you know or find yourself | **Always allowed**: type them into the Leads tab |
| Google Places API | Text Search Pro: 5,000 free requests a month, then about $32 per 1,000. Requires a billing account with a card. | Google's terms let us keep only the place ID long-term; storing names and phones in a CRM is questionable. | **Not now.** Only after a terms review and your billing approval. |
| Google Maps scraping, Yelp scraping, email-guessing tools | — | Against terms, or risks fabricated emails | **Never** |

**Expect** many small businesses to show only a contact form and no public email. Those leads stay in the CRM as "phone/contact-form only" for manual follow-up. We don't email them.

## 11. Accounts, logins and things only you can do

| Item | Needed for | Cost | Status |
|---|---|---|---|
| Google Sheets login in n8n | CRM | Free | ✅ Connected ("Google Sheets account") |
| Gmail login in n8n | Sending; later, reading replies | Free | ✅ Connected ("Gmail account"). **Please confirm which address it is.** It should be the co-founder's dedicated business Gmail. |
| Google Calendar login + a dedicated "Agency Sales Calls" calendar | Stage 6 | Free | ❌ Needed in Phase D |
| Free Gemini API key (AI Studio, personal or agency Google account, **no billing**) | AI Brain | Free | ❌ Needed in Phase B. A school Gemini subscription does **not** include API access, and school accounts may block AI Studio. |
| Agency details: legal/trade name, sender name, **physical mailing address**, website, services, pricing policy | Emails, Rulebook | — | ❌ Needed in Phase C |
| Own domain + Google Workspace mailbox (for example name@youragency.com) | Strongly recommended before **real** outreach (deliverability, trust, Gmail rules) | About $10–20 a year for the domain, plus about $7–8.40 per user per month (verify) | Optional; needs your approval |
| Mailing address (PO box or virtual mailbox), if you have no business address | Required by law in outreach emails | About $5–30 a month | Only if needed |
| Lawyer review of the outreach template | Compliance | Varies | Recommended before going live |

**About Gmail permissions:** n8n's standard Gmail login usually grants **full mailbox access** (read, send, change labels), not just sending. My connection can't read a login's exact permissions. You can check at Google Account → Security → "Your connections to third-party apps & services" → n8n. Whatever it allows, **I won't read any real inbox content until you approve Phase D's go-live.**

## 12. Costs

### While developing (Phases B–F, fictional data)
| Item | Cost |
|---|---|
| n8n Cloud | Free trial, then Starter at about $24/month (2,500 executions; reported, verify) |
| Gemini API (free tier) | $0, fictional data only. Google may use free-tier data. |
| Google Sheets, Gmail, Calendar | $0 |
| OpenStreetMap | $0 |
| **Total** | **$0 during the trial, then about $24/month** |

### Live, at a modest volume
Example month: 400 businesses researched, 150 emails, 25 replies, 5 meetings.

| Item | Cost per month |
|---|---|
| n8n Starter | about $24 |
| AI (paid tier, required once real emails are processed) | about $1–3 |
| Google Workspace + domain (recommended) | about $9 |
| Mailing address (if needed) | $0–30 |
| **Total** | **about $35–65/month** |

### Cost per unit (AI only, estimated)
| | Gemini 3 Flash (paid) | OpenAI GPT-5.4 nano | OpenAI GPT-5.4 mini |
|---|---|---|---|
| One business researched (about 5,000 tokens in, 800 out) | about $0.005 | about $0.002 | about $0.007 |
| One outreach draft | about $0.003 | about $0.001 | about $0.004 |
| One reply classified and drafted | about $0.004 | about $0.002 | about $0.006 |

At this scale **n8n's monthly fee dominates**: about $0.05 per researched lead, versus well under $0.01 for AI.

### n8n executions estimate (helpers don't count)
| Job | Runs per month |
|---|---|
| Discovery (weekdays) | about 22 |
| Research batches (3× a day) | about 66 |
| Drafting (2× a day) | about 44 |
| Sending (hourly 9–4, weekdays) | about 176 |
| Reports (2 a day) | about 44 |
| Reply check (every 30 min, 7 AM–9 PM weekdays; assumes every check counts) | about 640 |
| Meetings and errors | about 50 |
| **Total** | **about 1,050**, within Starter's 2,500 |

## 13. Limitations to know about

- **Gemini free tier:** small daily limits, and data may be used by Google. Fine for building and fictional tests. Switch to a paid tier or OpenAI before processing **real prospect emails**.
- **Gmail:** sending caps are about 500 a day (free Gmail) or about 2,000 (Workspace). Cold outreach from a free Gmail address risks the account being flagged. Start very small.
- **Google Sheets:** about 60 writes per minute per user. We write in batches.
- **n8n Starter:** 2,500 executions a month and 5 runs at the same time. The free trial ends after a set period.
- **Website research:** sites built mostly with JavaScript may show little text, which means lower confidence. We never invent missing facts. They go in "Unknowns to verify".
- **Discovery quality:** open data misses some businesses and has some closed ones. Every lead is verified on its own website before outreach.
- **My connection to n8n can't:** create folders, create Data Tables, see or create logins, or read past run details in depth. Those need a few clicks from you.

## 14. Phased plan

| Phase | What I build and test | What we need from you | Real-world actions (each needs your approval) |
|---|---|---|---|
| **A** (this) | Architecture | Approve this plan | None |
| **B** Research and qualification | A0, H1, H4, A1, A2, A3, A10, Scheduler (all off); tests with fictional Atlanta businesses and mocked website pages | Free Gemini key; the two folders; discovery source choice | Run A0 once to create `Agency CRM - DEMO`; one AI test on fictional data |
| **C** Outreach | A4, A5, Suppression List, Send Ledger, pause switch; tests with fictional @example.com addresses and simulated sending | Agency details; email template wording; daily limit | None (no real sends) |
| **D** Inbox and calendar | A6, A7, H2, H3; tests with simulated replies and simulated calendar | Calendar login and agency calendar; confirm the Gmail account | Optional: read-only test on a test label in the inbox |
| **E** Reports | A8, A9 calculated from Activity Log records; tests on fictional records | Report recipient email | One test report sent to you |
| **F** End-to-end | Full run with fictional businesses; pass/fail per stage | Review results | None |
| **Go-live** (later, step by step) | Switch on one piece at a time | Explicit approval for each | First real discovery run, then the first real email (to one approved lead), then reply monitoring, then the schedules |

Every "built" claim will come with a test result.
