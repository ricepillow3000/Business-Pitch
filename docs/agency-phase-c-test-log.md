# Agency system, Phase C: outreach build and test log

Phase C = **Stage 4: drafting, human approval, sending (switched off) and unsubscribe**.
n8n workspace: personal project, n8n Cloud.
Status: **every workflow is an inactive draft. Nothing is published, scheduled or switched on. No email was sent. No real inbox was read.**
Date: 2026-11-15.

## What was built

| # | Name | n8n ID | What it does |
|---|------|--------|--------------|
| C1 | `[AGENCY] C1 Draft Outreach Emails` | eqbjpKZJScLED37u | Picks Warm/Hot leads with verified research. Checks suppression. Asks the AI Brain for **one** idea based only on the saved evidence. Removes unsupported claims. Adds a fixed greeting, sign-off and legal footer. Saves the draft as **Pending review**. Never sends. |
| C2 | `[AGENCY] C2 Record Outreach Approvals` | RWPxQsyACQRt2Ns5 | Reads your Approve/Reject choices in the CRM. Stamps a "fingerprint" of the exact approved text and the time. **Any edit after approval cancels the approval and creates a new version.** Keeps a full history. |
| C3 | `[AGENCY] C3 Send Approved Outreach` | GT2ASqrdI85j1PI9 | Sends only approved, unchanged, unsuppressed drafts, after every safety check, at most 3 per run and 10 per day by default. **Sending is OFF in four separate ways** (see below). Never retries. |
| C4 | `[AGENCY] C4 Unsubscribe` | epz2HgdmEtiua5pF | One place that handles opt-outs: an unsubscribe link (token only), a one-click POST, and (from Phase D) "STOP" replies. Adds the address to the Suppression List straight away. |
| H6 | `[AGENCY] H6 Helper: Suppression Check` | Xq13OdqjXhOLBWZr | The **only** suppression check. Every sender calls it. If the list can't be read, everyone is blocked ("fail closed"). |
| H7 | `[AGENCY] H7 Helper: Send One Email (OFF)` | bl3Ls9beQiS3HewK | Builds and sends **one** email via the Gmail API, with `List-Unsubscribe` headers. **Its send step is disabled and has no Gmail login attached.** |
| H8 | `[AGENCY] H8 Helper: Save CRM Updates` | r3tCCgZ7xETHATMd | Writes Phase C changes to the CRM, matching rows by Lead ID, Draft ID or Ledger Row ID (never by position). |
| A0b | `[AGENCY] A0b Setup: Add Phase C Tabs (DEMO)` | xag2fppLlVjKTesi | One-time setup. Adds the tabs `Outreach Drafts`, `Draft History`, `Unsubscribe Requests`, 4 Send Ledger columns, 10 Settings rows (sending OFF) and the status dropdowns. Adds only what's missing, so it's safe to run twice. **Not run yet.** |

C1 replaces the planned "A4" and C3 the planned "A5" from the architecture plan.

### The four "off" switches on sending

1. `OUTREACH_PAUSED = YES` in the CRM Settings tab (the emergency pause).
2. `GMAIL_SENDING_ENABLED = NO` in the CRM Settings tab (new).
3. H7's "Send Via Gmail API" step is **disabled** inside n8n.
4. That step has **no Gmail login attached**, so even if it were switched on, it couldn't reach Gmail.

Plus: every workflow is inactive (no schedule), and in DEMO mode C3 refuses any address that doesn't end in `.example`.

## How testing was done

- **Local unit tests (86 for Phase C, 176 in total).** The JavaScript inside each code step runs on this computer against fictional data. The clock is fixed to a Monday at 10:00 New York time. Run with `cd n8n/agency && npm install && npm test`.
- **n8n "test with pinned data" (runs 95–114).**
  - Every Google Sheets step, every helper call, the AI step and the Gmail step got fake data.
  - A temporary "TEMP TEST CHECK" step stopped each run and reported the result as an error message, because my connection can only read an error message, not the run details.
  - All temporary steps were removed afterwards (checked against the full change history).
- **Fictional data only.** Businesses like Peachtree Pro Plumbing (DEMO), addresses ending in `.example`, and the fake sheet ID `DEMO_TEST`.

## Results

### Local unit tests: 86 of 86 passed (Phase C)

| Area | Tests | What they prove |
|---|---|---|
| H6 Suppression | 5 | Exact email, domain, sub-domain, opted-out lead and invalid address are all blocked. Unreadable list, unreadable Leads tab, or no CRM link mean **everyone is blocked**. |
| C1 Drafting | 17 | Only eligible leads are drafted. Suppressed leads get no AI request. AI answers are matched by Lead ID in any order. A suppression answer for a different email isn't trusted. Unsupported claims (guarantees, %, "our clients", "you are losing", invented quotes) are removed and listed. Research sources are kept. A draft naming another business is **not saved** and goes to the Review Queue. A missing mailing address is marked `[MISSING: …]`. If the AI fails, no draft is saved. |
| C2 Approval | 6 | Approval saves a fingerprint and time. A second run changes nothing. Approval without a reviewer name isn't accepted. An edit after approval makes version 2 and cancels approval. Rejections are recorded. Sent drafts are never touched. |
| C3 Switches | 7 | Emergency pause, system pause, Gmail switch off, missing address, weekend and broken config each block sending. |
| C3 Pick | 13 | Only approved + unchanged + allowed + footer-complete demo drafts go through. Edited drafts lose approval. Suppressed leads are marked and logged as "blocked send attempt". DEMO mode blocks real addresses. An earlier Sent or Failed row blocks a resend. "Not sent – paused" doesn't block a later try. The daily limit works. Unverifiable suppression or ledger means nothing is sent. |
| C3 Claim / Final / Record | 12 | A "Sending" row is written **before** Gmail. A parallel run that claimed first wins and the other doesn't send. Pause or unsubscribe in the middle of a run stops the email. Sent, failed, uncertain, crashed and step-off are each recorded correctly. Running twice sends nothing. |
| H7 Build / Result | 11 | `List-Unsubscribe` (mailto + link) is always added. One-click header only when verified. Header injection in the subject is neutralised. Refuses more than one email. 400 → failed, 5xx/timeout → uncertain, no login → failed, disabled step → not sent. |
| C4 Unsubscribe | 11 | A link token suppresses **only its own recipient**, and an extra `email=` in the link is ignored. Unknown or malformed tokens change nothing. "STOP" replies and plain-language opt-outs are recognised. A normal reply isn't an opt-out. Unreadable drafts list → nothing guessed, sent to a human. |
| A0b Setup | 4 | Adds the 3 tabs, the Send Ledger columns after the existing ones, only missing Settings rows; a second run adds nothing. |

### n8n simulated runs

| Run | Workflow | Scenario | Expected | Result |
|---|---|---|---|---|
| 95 | H7 | A valid email reaches the send helper | **Nothing sent**: "Gmail sending step is switched off" | **Pass** |
| 96 | H7 | Bad "To" address | Refused before sending | **Pass** |
| 97 | H6 | 3 addresses: normal, on Suppression List, opted out | allowed / blocked / blocked | **Pass** |
| 98 | H6 | **Deliberate failure:** Suppression List unreadable | Blocked "to be safe" | **Pass** |
| 99 | C1 | Full drafting run | — | **Test setup mistake** (see note 1) |
| 101 | C1 | Same, corrected. AI answers in reversed order, one with made-up claims, one naming another business; one lead on the Suppression List | Only Peachtree saved, greeting "Hi Peachtree Pro Plumbing team,", 4 claims removed, Pending review; Buckhead draft rejected for naming another business; blocked lead skipped | **Pass** |
| 102 | H8 | Save helper with fake sheet steps | Runs to the end | **Pass** |
| 103 | C2 | 6 drafts: approved, edited after approval, rejected, approved without a name, already approved, already sent | stamped / version 2 + approval cleared / rejected / back to Pending / untouched / untouched | **Pass** |
| 104 | C3 | **Default settings** (pause on, Gmail switch off, Sunday) | Stops before reading anything | **Pass**: 4 separate reasons listed |
| 105 | C3 | **Deliberate failure:** another run claimed the same email first | "Not sent – duplicate". Edited, suppressed, opted-out and real-address drafts refused | **Pass** |
| 106 | C3 | **Deliberate failure:** emergency pause switched on in the middle of the run | "Not sent – paused" | **Pass** |
| 107 | C3 | Simulated Gmail answer "sent" (step still off; the answer was faked) | Ledger Sent, lead Sent | **Pass** |
| 108 | C3 | **Deliberate failure:** simulated timeout ("uncertain") | Stays "Sending", Review Queue "Delivery uncertain", no retry | **Pass** |
| 109 | C3 | Run again after a "Sent" row exists | Nothing sent (run ends before the send part) | **Pass** |
| 110 | C4 | Link with B's token plus `email=` set to A's address | Only B suppressed, B's unsent draft marked Suppressed | **Pass** |
| 111 | C4 | Unknown token | Nothing changes | **Pass** |
| 112 | C4 | Reply "STOP" from `Peachtree Office <INFO@…>` | Peachtree suppressed (address cleaned and lower-cased) | **Pass** |
| 113 | C4 | **Deliberate failure:** drafts list unreadable | "Could not verify token". Nothing suppressed by guesswork | **Pass** |
| 114 | A0b | CRM with Phase B tabs only | Plans 3 tabs, 4 ledger columns, 9 missing Settings rows | **Pass** |

**Note 1 (run 99, my mistake):**
- I forgot to give the "Save Drafts And Updates" step fake data. C1 handed its result to the real H8 save helper (n8n run 100), which tried to write to the fake sheet ID `DEMO_TEST`.
- That sheet doesn't exist, so nothing could be written. The run stopped with "Invalid identifier".
- No real data was touched and no email was involved.
- Run 102 then showed that H8 itself works when its sheet steps have fake data, and run 101 repeated the C1 test correctly.

### How the requested checks map to tests

| You asked us to verify | Where |
|---|---|
| Drafts use the correct lead | Local C1 tests; run 101 (answers in reversed order still matched by Lead ID; draft naming another business rejected) |
| Research sources are preserved | Local C1 test "research sources preserved" |
| Unsupported claims are removed | Local C1 tests; run 101 (4 removed) |
| Rejected drafts can't be sent | Local C3 preselect test; run 103 |
| Edited drafts need fresh approval | Local C2 + C3 tests; runs 103 and 105 |
| Suppressed leads can't be contacted | H6 tests; runs 97, 98, 101, 105 |
| Duplicate runs can't create duplicate sends | Local C3 tests; runs 105 and 109 |
| Unsubscribes block future outreach | Local C4 + C3 tests (unsent drafts marked Suppressed; H6 blocks opted-out leads); runs 110 and 112 |
| Unsubscribe links can't suppress unrelated addresses | Local C4 test; run 110 |
| Failures don't cause uncontrolled retries | Local C3 record tests; run 108 |
| The pause blocks sending | Runs 104 and 106 |
| Gmail stays disconnected during tests | Run 95; H7's send step is disabled with no login; every C3 run had the send helper replaced with fake data |

## What is simulated and what is untested

| Part | Status |
|---|---|
| All decision logic (code steps) | **Tested**, locally and inside n8n |
| Google Sheets reads and writes for the new tabs | **Untested for real.** Fake data in every run. Needs the DEMO CRM link and A0b run once. |
| AI drafting (H1 → Gemini) | **Simulated.** AI answers were written by hand, and the AI step stays off until a free Gemini key is connected. |
| Gmail API sending (H7) | **Untested and switched off.** No login attached. Raw-message format checked only by decoding it locally. |
| Delivery of `List-Unsubscribe` headers, and Gmail showing an "Unsubscribe" button | **Untested.** Needs a real send to a test inbox (needs your approval). |
| Unsubscribe link and one-click POST over the internet | **Untested.** The webhook only works once C4 is **published**, which needs your approval. |
| "STOP" replies arriving from Gmail | **Interface only.** Reading the inbox is Phase D. |
| Random unsubscribe token quality | Uses `crypto.getRandomValues` when n8n allows it, else a weaker fallback. **Not verified inside n8n.** Check before go-live. |
| A10 firing automatically for these workflows | Untested. Only works for published workflows. |

## Bugs found and fixed while building Phase C

1. A regular-expression pattern used a backslash, which the n8n workflow format doesn't allow. It was rewritten without one.
2. The "result recording" step had a confusing rule for when a crashed send counts as "uncertain". It was simplified and tested.
3. A test expected no "http" anywhere in the finished email, but the footer rightly contains the agency website and unsubscribe link. The test was corrected to check the unsubscribe link instead. The claim filter itself only ever cleans the AI's text.

## CRM setup: `Agency CRM - DEMO` created and verified (2026-11-17)

**Why the CRM was missing:**
- n8n's "Google Sheets account" login was set to block "HTTP Request" steps.
- A0 and A0b both use HTTP Request steps, so the earlier A0 runs (34 and 116) were refused before reaching Google. No sheet was created, so there are no duplicates.
- **You changed the login's "Allowed HTTP Request Domains" setting.** That fixed it.
- That login can read and create spreadsheets, but not search Drive. That's a narrower permission, which is fine.

| Run | What | Result |
|---|---|---|
| 115 | A0 dry run (Google steps faked) | Pass: A0's own code works |
| 119 | Read-only check through n8n's Google login | Showed the cause: "credential is configured to prevent use within an HTTP Request node" |
| 124 | **A0 run once for real**, then the sheet read back by its ID | **Created** `Agency CRM - DEMO`, 13 tabs |
| 127 | H0 with the new CRM link, reading the real Settings tab (read-only) | ok = true, DEMO, OUTREACH_PAUSED = YES, 21 settings |
| 129 | **A0b run once** | Partly failed. The 3 new tabs were added (each once), but writing the headings failed: "Bad request" (see bug 4) |
| 133 | Read-only check of the sheet | Confirmed the half-finished state: 16 tabs, no duplicates, new tabs empty, Settings unchanged |
| 136 | **A0b run again after the fix** | **Pass**: headings in the 3 tabs (27/8/7 columns), 4 Send Ledger columns, 10 new Settings rows. No duplicate tabs or keys. GMAIL_SENDING_ENABLED = NO, ONE_CLICK_UNSUBSCRIBE_VERIFIED = NO, OUTREACH_PAUSED = YES |

To see results my connection can't otherwise read, each check used a temporary runner: it called the workflow as a sub-workflow and reported the result as an error message. Afterwards, all temporary runners and check workflows were archived, and the temporary start points added to A0 and A0b were removed.

**Bug 4 (found in run 129, fixed):**
- A0 creates each tab exactly as wide as its headings, so the Send Ledger was only 9 columns wide. A0b tried to write 4 new headings into columns J–M, so Google refused the whole write.
- A0b also only wrote headings into tabs it had just created, so a second run would have left the empty tabs blank.
- **Fix:** A0b now reads each tab's width and widens it first. It also fills headings into any of its tabs that are still empty.
- Four new local tests cover this, including the exact half-finished state from run 129. Phase C now has 90 tests; 180 in total, all passing.

The CRM link is stored only in n8n (H0 → CRM Location), not in this repository.
