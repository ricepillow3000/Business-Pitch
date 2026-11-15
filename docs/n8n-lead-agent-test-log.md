# n8n Lead Agent: build and test log

Demo business: **Bright Smile Dental (DEMO)**, a fictional dental office.
n8n workspace: personal project, n8n Cloud.
Status: **all 5 workflows are inactive drafts. None are published.**

## The five workflows

| # | Name | n8n ID | What it does |
|---|------|--------|--------------|
| 1 | `[TEST] Lead Agent - 1 Main Chat Agent (Demo: Bright Smile Dental)` | IdkNaVucRL092QrI | Chat box + AI agent. Per-client settings live in the **Business Settings** node. |
| 2 | `[TEST] Lead Agent - 2 Tool: Save Lead` | JwQ576zMkSElwzKe | Saves or updates one row per customer (matched on email). Emails the owner for new Qualified / Needs Human leads. Also used for human handoff. |
| 3 | `[TEST] Lead Agent - 3 Tool: Check Availability` | gPWyXH6hFXTpN9Pz | Reads the calendar and returns only open slots inside business hours. Read-only. |
| 4 | `[TEST] Lead Agent - 4 Tool: Book Appointment` | cD8lXjNfM9xIq1bd | Re-checks the calendar, blocks double bookings and duplicates, creates the event, marks the lead Booked, emails the owner. |
| 5 | `[TEST] Lead Agent - 5 Error Logger` | 3RLi9Dg58a8G7zMG | When a live workflow fails, writes to an "Error Log" tab and emails the owner. |

## How testing was done

- n8n "test with pinned data": every Google Sheets, Google Calendar, Gmail and AI step was replaced by fake data. **No real service was contacted. No email was sent. No calendar event was created.**
- A temporary "TEMP TEST CHECK" step compared each result with the expected answer and failed the run on any mismatch. One run was made to fail on purpose to prove the check works. All temporary check steps were removed afterwards.
- Fictional customers: Maria Lopez, Devon Carter, Priya Shah, Sam Okafor, Hannah Kim. All emails use `example.com`.

## Results

### 2 - Save Lead: 5 of 5 passed (+1 deliberate failure that was correctly caught)

| Scenario | Expected | Result |
|---|---|---|
| Check-step sanity run (wrong answer on purpose) | Run fails | Failed as intended |
| New customer, messy email `" Maria.Lopez@Example.com "`, status typed in lowercase | Cleaned email, saved as Qualified, owner alerted | Pass |
| Same customer returns, already Qualified | Row updated, no second owner email | Pass |
| Customer already Booked, AI sends status New | Status stays Booked (never downgraded) | Pass |
| Invalid email `"sam at mail"` | Not saved, AI told to ask for the email | Pass |
| Upset customer, no email, wants a person | Saved as Needs Human using phone as the key, owner alerted | Pass |

### 3 - Check Availability: 6 of 6 passed

| Scenario | Expected | Result |
|---|---|---|
| Wed with a 1-hour booking, a 30-min meeting, a cancelled event and a "free" reminder | 12 open slots; cancelled and "free" events ignored | Pass |
| Weekend (office closed) | 0 slots | Pass |
| All-day "office closed" event | 0 slots | Pass |
| Two empty weekdays | 32 slots, 9:00 AM first, 4:30 PM last | Pass |
| Date in the past | Search starts today, with a note | Pass |
| Different client: Los Angeles time zone, Tue-Sat, 10-2, 60-min slots | 3 slots, correct times | Pass |

### 4 - Book Appointment: 12 of 12 passed

| Scenario | Expected | Result |
|---|---|---|
| Free slot | Booked | Pass |
| Someone else booked an overlapping time | Not booked ("slot taken") | Pass |
| Same customer, same time already booked | No duplicate ("already booked") | Pass |
| Customer already has a different upcoming booking | Not booked, sent to a human | Pass |
| After closing time (6 PM) | Rejected | Pass |
| Saturday | Rejected | Pass |
| Date in the past | Rejected | Pass |
| Odd start time (10:10) | Rejected | Pass |
| Missing email | Rejected | Pass |
| All-day "office closed" event | Not booked | Pass |
| Different client (Los Angeles, 60-min slots) | Booked at the correct time | Pass |
| Unreadable time ("next Tuesday morning") | Rejected | Pass |

### 5 - Error Logger: 2 of 2 passed

| Scenario | Expected | Result |
|---|---|---|
| Calendar step fails with a 503 error | Workflow name, failed step, message and link captured | Pass |
| Workflow could not start (no execution data) | Safe fallback text, no crash | Pass |

### 1 - Main Chat Agent: 1 of 1 passed (setup only)

| Scenario | Expected | Result |
|---|---|---|
| Chat message arrives | Business Settings load, AI instructions are built with every rule, tool name and the handoff promise, with no blank or broken text | Pass |

The AI agent itself was switched off during this test so no AI call (and no charge) could happen. It was switched back on afterwards.

## Not tested yet (needs real accounts)

- Real Google Sheets reads and writes (sheet must exist with the right column headings).
- Real Google Calendar reads and event creation.
- Real Gmail sending.
- The AI model's actual conversation behavior: whether it follows the rules, asks the right questions and calls the tools at the right moments.
- The Error Logger firing automatically. n8n only fires it for **published** workflows.

## Errors and limitations found

1. **Error Logger not linked yet.** n8n refused to link it as the "error workflow" because the Error Logger is not published. Linking needs approval to publish workflow 5 first. Nothing changed when this was refused.
2. **AI model credential auto-attached.** On creation, n8n automatically attached a "Gateway credits" credential to the AI Model node. Gateway credits are n8n's usage-based (paid) AI billing. Nothing has been run with it. It needs a decision: keep it, or replace it with a free Google Gemini key.
3. **Simple Memory** forgets conversations if n8n restarts. Fine for a demo. A database memory would be needed for production.
4. The customer gets **no automatic confirmation email**. This is on purpose (no messages to customers without approval). Only the owner is emailed.
5. Changing or cancelling an existing appointment goes to a human. There is no reschedule tool yet.
6. Detailed run results cannot be read through the connector. Only pass/fail is visible, which is why the TEMP TEST CHECK step was used.

## Setup still needed

1. Create a Google Sheet with two tabs:
   - `Leads` with headings: `Email, Name, Phone, Reason, Status, Qualification Notes, Conversation Summary, First Contact, Last Updated, Appointment Start, Appointment End, Calendar Event ID`
   - `Error Log` with headings: `Time, Workflow, Failed Step, Error, Execution Link`
2. In workflow 1, **Business Settings**: paste the sheet link and the owner email.
3. In workflow 5, **Error Log Settings**: paste the same sheet link and the owner email.
4. In n8n, connect Google Sheets, Google Calendar and Gmail (sign in with Google) and pick them on each Google step in workflows 2, 3, 4 and 5.
5. Decide on the AI model credential (see limitation 2).
6. Approve publishing workflow 5 so it can be linked as the error workflow.
7. Approve a live test using a test Google account and a fictional customer.
