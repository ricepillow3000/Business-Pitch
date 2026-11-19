# Agency system, Phase B: build and test log

Phase B = **research and qualification** (Stages 1–3) plus the CRM and safety helpers.
n8n workspace: personal project, n8n Cloud.
Status: **every workflow is an inactive draft. Nothing is published, scheduled or switched on.**
Date: 2026-11-15.

## What was built

| # | Name | n8n ID | What it does |
|---|------|--------|--------------|
| A0 | `[AGENCY] A0 Setup: Create Agency CRM (DEMO)` | rD4hJcfkfQ9W9LWl | One-time setup: creates the `Agency CRM - DEMO` Google Sheet with 13 tabs, headings, dropdowns and fictional sample rows |
| H0 | `[AGENCY] H0 Helper: Agency Config` | EwEgjWyFneyjExzI | Reads the Settings tab. Any problem → "not OK, paused" |
| H1 | `[AGENCY] H1 Helper: AI Brain` | wD2yN7CAk0xz0oiW | The only place the AI model lives. Wraps website text as data, demands strict JSON, logs estimated tokens and cost. **AI Model step is switched off** (see limitation 2) |
| H4 | `[AGENCY] H4 Helper: Log Activity` | W4IqWN9nxt1abIKb | Writes events to the Activity Log tab |
| A1 | `[AGENCY] A1 Discover Businesses` | FnT4B2K1YiL3jIvh | Discovery Inbox (+ optional OpenStreetMap) → checks → duplicate and Suppression List filter → new "Not researched" leads |
| A2 | `[AGENCY] A2 Research & Analyze` | 7dhya6JoSAHZggga | robots.txt → homepage + /contact → fixed-rule facts → AI Brain → quote check → A3 score → save to Leads + Review Queue |
| A3 | `[AGENCY] A3 Score & Qualify` | mMSUbBxUdWhbLP5e | Fixed point rules: Warm/Cold; Hot only from a real reply |
| A10 | `[AGENCY] A10 Agency Error Logger` | PROqvCbu5CjS6wuY | Logs failures to the Error Log tab. **Owner email step switched off** |
| H5 | `[AGENCY] H5 Helper: Read One Business Website` | yzcEwRluSeGL8h3O | Added in the follow-up. Reads **one** lead's website per run (robots.txt → homepage → /contact) and stamps the result with that lead's ID |

Also done:
- The 5 dental workflows were renamed `[CLIENT DEMO] Dental Front Desk - …` and tagged `client-demo`. They stay inactive, and their history is kept.
- New workflows are tagged `agency-internal`.

The source code of every agency workflow and the local tests are saved in [`n8n/agency/`](../n8n/agency/).

## How testing was done

- **Local unit tests (89).** The JavaScript inside every code step was extracted and run on this computer against fictional inputs, with the expected answer written down first.
- **n8n "test with pinned data".** Every Google Sheets, HTTP (website), AI and Gmail step was replaced by fake data. **No real website was visited, no AI was called, no sheet was written, no email was sent.**
- **Temporary checker.** A "TEMP TEST CHECK" step compared each result with the expected answer and failed the run on any mismatch.
  - One run per checker was made to fail on purpose, to prove the checker works.
  - For A2, a "flip" switch made the checker fail when it reached a named lead. This proved each of the three paths really ran (website read, robots.txt blocked, no website).
  - All checker steps were removed afterwards.
- **Fictional data only.**
  - Businesses: Peachtree Pro Plumbing, Buckhead Comfort HVAC, Marietta Ridge Roofing, Glow Lab Med Spa, Iron Oak Fitness, Savannah Shine Auto, Fictional Gym. All end in "(DEMO)".
  - Web addresses use the reserved `.example` ending, and phone numbers use 555.

## Results

### Local unit tests: 89 of 89 passed

| Workflow | Tests | Highlights |
|---|---|---|
| A3 Score | 11 | Hot needs a real reply; Warm needs score ≥ 60 + public email + not-Low confidence; opted-out → Unsubscribed; later stages never downgraded |
| H0 Config | 5 | Missing CRM link, unreadable Settings, or DEMO/LIVE mismatch → paused |
| H4 Log | 1 | Rows formatted correctly |
| H1 AI Brain | 12 | Fake "end of data" markers inside website text are removed; invalid JSON, missing keys and AI errors → ok = false; token estimate > 0 |
| A1 Discover | 20 | See table below |
| A2 Research | 36 | See table below |
| A10 Error Logger | 4 | Full error captured; spreadsheet formulas neutralised; placeholder owner email never used; no-data fallback |

### n8n simulated runs

#### A1 Discover Businesses

| Run | Scenario | Expected | Result |
|---|---|---|---|
| 45 | Main path, 8 inbox rows (status only) | Runs to the end | Pass, but see bug 1 |
| 46 | System paused | Stops at "Stopped: Paused Or Not Set Up" | Pass |
| 47 | OpenStreetMap on, 2 fictional places (status only) | Runs to the end | Pass, but see bug 1 |
| 78 | **After fix**, with checker: 8 inbox rows, 1 existing lead, 1 suppressed domain | Adds Peachtree, Buckhead, Iron Oak; 2 duplicates (incl. `www.` + `/contact` version of Peachtree), 2 rejected (Savannah outside area, no name), 1 suppressed; website saved as clean `https://…` | **Pass** |
| 79 | Same, but Suppression List emptied on purpose | Checker must fail because Marietta gets added | Failed as intended |

#### A2 Research & Analyze

| Run | Scenario | Expected | Result |
|---|---|---|---|
| 48 | Checker sanity run (wrong answer on purpose) | Run fails | Failed. **Also revealed bugs 1 and 2** |
| 50 | After bug 2 fix | All checks pass | Failed. Bug 1 still present |
| 54 | After bug 1 fix: 6 leads (4 to research, 1 already done, 1 opted out) | All checks pass | **Pass** |
| 58 | Flip on Peachtree (website read + AI path) | Checker reports it passed in that path | **Pass**: Peachtree Warm, High confidence, email found on /contact, 3 real quotes, Review Queue "Lead ready for review"; Marietta in the same run flagged |
| 60 | Flip on Glow Lab (robots.txt says "Disallow: /") | Not read; Low; Cold | **Pass**: site not fetched, note "robots.txt asks automated tools not to read this website" |
| 63 | Flip on Fictional Gym (no website) | Low; Cold; "check by hand" | **Pass** |

Scenarios covered in A2's local and n8n tests:

| Scenario | Expected | Result |
|---|---|---|
| Website hides "ignore previous instructions … guaranteed 300% ROI" in invisible text, and the AI is fooled into saying High | Our own check spots it; confidence forced to Low; Cold; Review Queue "Suspicious website text" | Pass |
| AI promises "This will guarantee a 300% ROI" | Flagged; Review Queue "AI wording check" | Pass |
| AI makes up quotes ("Rated the #1 plumber in Georgia by 5,000 customers") | Made-up quotes removed; confidence lowered; note explains | Pass |
| No real quotes at all | Confidence Low | Pass |
| AI answer starts with `=HYPERLINK(...)` | Saved as plain text, never as a formula | Pass |
| AI picks an opportunity not on the list | Saved as "Unknown"; confidence capped at Medium | Pass |
| AI fails once / twice | Lead stays "Not researched", Error Status "Research failed x1/x2", retried next run | Pass |
| AI fails a third time | Website facts saved, Low confidence, "AI failed x3", Review Queue item; not retried forever | Pass |
| Website down (500) | Retry later; after 3 tries saved as unreachable | Pass |
| robots.txt blocks /contact only | Homepage read, contact page skipped | Pass |
| robots.txt unreachable or 503 | Site not read now; retry later | Pass |
| Internal address (`http://127.0.0.1/…`, `localhost`) in the Website column | Never fetched | Pass |
| Leads tab can't be read | Run stops with a clear error, which A10 will log once linked | Pass |

#### A10 Agency Error Logger

| Run | Scenario | Expected | Result |
|---|---|---|---|
| 80 | A2 fails at "Read Leads" with a 503 | Row written to Error Log (pinned); email step stays off | Pass |
| 81 | Workflow could not start and the CRM isn't set up | Safe fallback, no crash, "Not Logged: CRM Not Set Up" | Pass |

#### Helpers and setup (earlier in Phase B)

| Run | Workflow | Result |
|---|---|---|
| 33 | A0 blueprint (pinned) | Pass |
| 34 | **A0 real run** (approved): create `Agency CRM - DEMO` | Started. **Not yet confirmed** that the sheet exists (see setup step 1) |
| 41 | A3 | Pass |
| 42 | H0 | Pass |
| 43 | H4 | Pass |
| 44 | H1 (AI step pinned) | Pass |

## Bugs found and fixed during testing

1. **The `URL` tool doesn't work inside n8n Code steps.** Every website looked invalid, so every lead was treated as "no website". Local tests didn't catch it because the tool works on a normal computer. A1's earlier runs 45 and 47 only checked pass/fail, so they missed it too.
   - **Fix:** website addresses are now read with plain text rules in both A1 and A2. Re-tested in runs 54 and 78.
2. **Matching website pages to the right business.** Item matching through HTTP and pinned steps wasn't reliable.
   - **First fix (replaced):** results were matched by their position in the list.
   - **Final fix (after your review):** position matching was removed. See "Phase B follow-up" below. Each business is now read in its own separate run of a new helper, H5. Every result carries that business's **Lead ID**, and A2 matches results by Lead ID only.

## Phase B follow-up: Lead ID matching instead of list position (requested in your review)

**Why:** list-position matching could give one business another business's website facts if the order of items ever changed.

**What changed:**
- **New helper H5** (`yzcEwRluSeGL8h3O`). A2 calls it once per lead (n8n's "run once for each item" mode). Each call reads only that lead's website, and its answer is stamped with the lead's ID.
- **A2** now has "Match Website Results". It matches each answer to its lead **by Lead ID**. A missing answer means "try again later". A duplicate answer, an answer for an unknown ID, or an error item is ignored and logged, never applied to another lead.
- **The AI Brain (H1)** now returns the Lead ID with every answer. A2 matches AI answers by Lead ID too, and a missing answer counts as a failed attempt for that lead only.
- **H1** also got a 4-second pause between AI requests, to stay inside the free Gemini rate limit.

**Tests:**

| Test | Scenario | Result |
|---|---|---|
| Local (37 A2 tests) | Results **shuffled**, one **missing**, one **duplicated**, one with a **swapped/unknown Lead ID**, AI answers in reverse order | Every lead got only its own facts. Missing → retry later. Duplicate/unknown → ignored. **Pass** |
| Run 82 | A2 full run with pinned helper answers | **Pass** |
| Run 85 | Flip on Peachtree (website + AI path) | **Pass**: Peachtree "Lead ready for review"; Marietta in the same run flagged "Suspicious website text" + "AI wording check" |
| Run 87 | Flip on Glow Lab (robots.txt blocks) | **Pass** |
| Runs 90–92 | H5 on its own: website read / robots.txt blocked / no website | **Pass** on all three paths |
| Run 93 | H1 with the new Lead ID answer format (AI step pinned) | **Pass** |

All temporary checkers were removed afterwards.

## CRM check (`Agency CRM - DEMO`)

- **Still not confirmed.** My Google Drive connection uses a different Google account from the one n8n's Google login uses, so it can't see that account's files. n8n doesn't let my connection read run results either.
- **I did not create a new one**, to avoid duplicates.
- **Same CRM everywhere (checked in the code):** A1, A2, C1, C2, C3, C4 and A0b all take the CRM link from **H0 only**. H6 and H8 receive it from whichever workflow calls them. A3 and H5 don't use the CRM. So pasting the link once into **H0 → "CRM Location"** connects every workflow to the same sheet.

## Not tested yet (needs real accounts or approval)

- That `Agency CRM - DEMO` really exists, and real Sheets reads and writes against it.
- A real AI call. The AI Model step is off until a free Gemini key is selected. The "fooled AI" cases above were simulated answers.
- Fetching real websites (robots.txt, HTML from real sites, JavaScript-heavy sites).
- Real OpenStreetMap queries. They're off by default.
- A10 firing automatically. n8n fires error workflows only for **published** workflows, and A10 isn't linked yet.
- Phases D–F: reply reading, meetings, reports, the Scheduler. Phase C was built afterwards; see [`agency-phase-c-test-log.md`](agency-phase-c-test-log.md).

## Errors and limitations

1. **A0 result unconfirmed.** My Google Drive connection uses a different Google account from n8n's, and I can't read run results through the n8n connection. Please check the n8n-connected Google account for `Agency CRM - DEMO`. Don't run A0 again: it would create a second copy.
2. **AI Model step switched off.** n8n auto-attaches its pay-per-use "Gateway credits" to any Gemini step without a login, and my connection can't choose another login. The step stays off until you select a free Gemini key credential.
3. **Run details aren't readable through my connection**, only pass/fail and error messages. That's why the temporary checkers were used.
4. **Workflows that can reach a step from several paths run that step once per path.** In A2 the "Check AI Findings → save" part can run up to 4 times per run, each time for different leads. Results are correct, but the Activity Log gets one row set per path.
5. **Discovery quality depends on the Discovery Inbox.** OpenStreetMap is optional and uneven for small trades. Other sources (Foursquare, Overture, Brave Search) are documented but not built.
6. **Contact pages:** only `/contact` is tried. Sites that use `/contact-us` or similar fall back to homepage facts only.

## Setup still needed (from you)

1. Find `Agency CRM - DEMO` in the Google account connected to n8n. Paste its link into **H0 → "CRM Location" → crmUrl**.
2. Create a free Gemini API key (Google AI Studio, project **without** billing). Add it in n8n as a Google Gemini credential, select it in **H1 → "AI Model (swap here)"**, and switch that step on.
3. Optional: create two n8n folders, `A. Internal Agency Automation` and `B. Client Automation Products`. I'll move the workflows in.
4. Approve, when ready: one real AI test on a fictional business (free tier), and publishing A10 so it can be linked as the error workflow.
