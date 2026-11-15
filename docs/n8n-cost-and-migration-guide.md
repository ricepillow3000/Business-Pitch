# AI Front Desk: costs, usage tracking and the Gemini → OpenAI plan

Last updated: 2026-11-15. Prices change often. Every price below came from web search results and could not be checked on the official pages from this session. **Check the official pricing pages before you rely on them** (links at the end).

---

## 1. How the AI model can be swapped without rebuilding anything

```
           ┌──────────────────────────── Main Chat Agent (workflow 1) ───────────────────────────┐
 Chat ──►  │ Business Settings ─► Build AI Instructions ─► AI Front Desk Agent ─► Measure Usage ─► Reply
           │                                                  │   ▲                                  │
           │                                    swap ONLY ──► │ AI Model (swap here)                 │
           └──────────────────────────────────────────────────┼──────────────────────────────────────┘
                                                              │ plain-text tool calls
                          ┌───────────────────┬───────────────┴──────┬────────────────────┐
                          ▼                   ▼                      ▼                    ▼
                   2. Save Lead        3. Check Availability   4. Book Appointment   5. Error Logger
                   (no AI inside)      (no AI inside)          (no AI inside)        (no AI inside)
```

- The AI is in **one node only**: `AI Model (swap here)`.
- Workflows 2–5 contain no AI. They receive plain text and return plain text, so they work the same with any AI.
- The rules the AI follows are plain text built from **Business Settings**. They are not tied to one AI company.
- To swap the AI you change that one node, plus three labels in Business Settings (`aiModelLabel`, `aiInputPricePerMillion`, `aiOutputPricePerMillion`) so the usage log stays accurate.

## 2. Recommended Gemini free-tier model

**Recommendation: Gemini 3 Flash** (`models/gemini-3-flash-preview`, already set). It is n8n's default Gemini model, supports tool calling, and handles multi-step tool use better than the Lite models.

**Backup: Gemini 3.1 Flash-Lite.** Switch to it if the free daily limit for Gemini 3 Flash is too small for testing. It is cheaper and reportedly has a larger free daily allowance, but it can be less reliable at picking the right tool.

Why the daily limit matters: **one test conversation uses about 8–12 AI requests.** Third-party sources disagree on free daily limits, from about 20 to about 1,500 requests per day depending on the model. At 20 requests a day you could test only 1–2 conversations daily. Your real limits are shown at <https://aistudio.google.com/rate-limit> once you have a key.

**Important privacy rule:** on the free tier, Google may use what you send to improve its products. **Use the free tier only with made-up customer data.** Before any real client goes live, move to a paid tier (Gemini paid or OpenAI), where your data is not used for training.

### Keeping it free
- Create the key in **Google AI Studio** in a Google Cloud project that has **no billing account attached**. Without billing, Google cannot charge you. If you go over the free limit, requests are simply refused (error 429).
- **Do not use "Gateway credits"** in n8n. That is n8n's pay-per-use AI billing. n8n attached it automatically. I switched the AI Model node **off** as a safety lock until your free key is connected.

## 3. Usage tracking (per customer conversation)

After every reply, the **Measure Usage** step writes one row to a `Usage Log` tab in the client's Google Sheet. **No customer names, emails or messages are logged**, only IDs and numbers.

| Column | What it means | Exact or estimate? |
|---|---|---|
| Time, Client ID, Conversation ID, Turn, Execution ID | Which client, which chat, which message | Exact |
| Run Type | `test` (from the editor) or `live` | Exact |
| AI Model | The label from Business Settings | Exact (if you keep the label updated) |
| AI Requests | Calls made to the AI for this message (tool calls + 1) | Very close. Can over-count if the AI calls two tools at once. |
| Tool Calls / Tools Used | Which helper workflows the AI used | Exact |
| Est Input Tokens / Est Output Tokens | Rough size of what was sent and received | **Estimate** (about 4 characters per token). Does not include Gemini's hidden "thinking" tokens. |
| Est Cost If Paid (USD) | Estimated tokens × the prices in Business Settings | Estimate. Free tier actual cost = $0. |
| Billable n8n Executions | 1 for a live message, 0 for a test | Exact |
| Sub-workflow Executions | Helper workflows run (these are not billed) | Exact |

**Per-conversation totals:** add a `Usage Summary` tab to the sheet with this formula in cell A1:

```
=QUERY('Usage Log'!A:O, "select C, count(D), sum(H), sum(I), sum(K), sum(L), sum(M), sum(N) where C is not null group by C label count(D) 'Messages'", 1)
```

**Exact token numbers** are shown in two places:
1. **Google AI Studio → Usage**: exact requests and tokens for each API key, per day. If each client has its own key, this gives exact per-client totals.
2. **n8n → Executions →** open a run → click the AI Model step: tokens for each AI call in that message.

Every month or so, compare the sheet's estimates with AI Studio's real numbers. If the sheet is, for example, 30% low, add 30% to the cost estimates. Later, with OpenAI, the OpenAI usage dashboard does the same job.

*Why not exact tokens in the sheet?* n8n does not pass the AI's token counts on to later steps. Getting them would need the n8n API, which needs an API key and may not be available on the free trial. This can be added later.

Tested with fake data: usage row values correct; no customer text in the row; the customer still gets the reply when the usage log fails (for example, when the sheet is not connected).

## 4. How n8n counts executions for this setup

```
Customer sends 1 message
   └─► Workflow 1 (Main Chat Agent) runs once ................ 1 execution  ← COUNTS
         ├─► Workflow 2 Save Lead (if the AI uses it) ......... sub-workflow ← does NOT count
         ├─► Workflow 3 Check Availability ................... sub-workflow ← does NOT count
         └─► Workflow 4 Book Appointment ..................... sub-workflow ← does NOT count
   Workflow 5 Error Logger runs only if something breaks ..... 1 execution  ← counts (rare)
```

- **Every customer message = 1 execution.** The chat trigger starts workflow 1 again for each message.
- A typical conversation (greeting → details → questions → choose a time → confirm) has **about 6 messages, so about 6 executions.**
- n8n's documentation says **sub-workflow executions do not count** toward your monthly execution limit. So the 3–5 tool runs per conversation are free.
- Test runs from the n8n editor (including its built-in chat test panel) are reported not to count.
- The Error Logger counts only when an error happens.

## 5. Monthly cost estimate

### Assumptions (per conversation)
- About 6 customer messages → **about 6 billed n8n executions**
- About 11 AI requests (6 replies + about 5 tool calls)
- About 2,100 input tokens for each AI request, measured from our real AI instructions and tool descriptions in a simulated test
- **About 30,000 input tokens and 3,000 output tokens** per conversation (output includes an allowance for thinking tokens). The real figure could be 50% lower or higher.

### AI cost per conversation (paid prices; reported, not verified)

| Model | Input / output price per 1M tokens | Cost per conversation |
|---|---|---|
| Gemini 3 Flash (paid tier) | $0.50 / $3.00 | about $0.024 |
| Gemini 3.1 Flash-Lite (paid tier) | $0.25 / $1.50 | about $0.012 |
| OpenAI GPT-5.4 nano | $0.20 / $1.25 | about $0.010 (about $0.006 with automatic caching) |
| OpenAI GPT-5.4 mini | $0.75 / $4.50 | about $0.036 (about $0.021 with automatic caching) |
| Gemini free tier | $0 | $0, but daily limits, and Google may use the data |

### Monthly totals (USD, monthly billing)

| | 100 conversations | 1,000 conversations | 5,000 conversations |
|---|---|---|---|
| n8n executions used | about 600 | about 6,000 | about 30,000 |
| n8n plan needed (reported prices) | Starter, about $24 (2,500 executions) | Pro, about $60 (10,000 executions) | More than Pro. Business plan (one source says up to about $800) **or** self-host n8n for about $10–40 of server cost |
| AI with Gemini free tier | $0, but limits likely too low and not allowed for real data | not realistic | not realistic |
| AI with GPT-5.4 nano | about $1 | about $10 | about $50 |
| AI with Gemini 3 Flash (paid) | about $2.40 | about $24 | about $120 |
| AI with GPT-5.4 mini | about $3.60 | about $36 | about $180 |
| Google Sheets, Calendar, Gmail | $0 with a free Google account | $0 | $0 (Gmail has daily sending limits; check them) |
| **Total (n8n + GPT-5.4 nano)** | **about $25** | **about $70** | **about $90 self-hosted, or about $850 on the Business plan** |

What this means:
- **n8n is the biggest cost**, not the AI.
- Between 1,000 and 5,000 conversations a month, self-hosting n8n becomes worth looking at. It is a bigger decision: you would maintain the server yourselves.
- **While developing:** the n8n free trial plus Gemini free tier costs $0. After the trial, n8n Starter (about $24/month) is the only required cost.

## 6. Migration procedure: Gemini → OpenAI

Do this only when the five workflows run reliably and you have a reason to upgrade (real client data, quality, or volume).

**Before you start (about 15 minutes, done by you)**
1. Create an OpenAI account at platform.openai.com → Billing → add a payment method. *This costs money, so it needs your approval.*
2. Set a **monthly spending limit** (for example $20) and an email alert at 50%.
3. Create a **Project** for each client (for example "bright-smile") and an API key inside it. Each client's usage then shows separately in OpenAI.
4. In n8n: Credentials → Add → **OpenAI** → paste the key. Name it `OpenAI - <client name>`. Never paste keys into chat.

**The swap (done by me, about 10 minutes)**
5. n8n saves a restore point automatically (version history).
6. In workflow 1, replace `AI Model (swap here)` with an **OpenAI Chat Model** node, using the same name and connected to the agent's "Chat Model" input.
   - Model: `gpt-5.4-nano` to start (cheapest). Use `gpt-5.4-mini` if nano picks the wrong tools.
   - Temperature 0.2, maximum reply length about 1,024 tokens.
   - Credential: the OpenAI credential from step 4. **Not Gateway credits.**
7. In Business Settings, update `aiModelLabel` (for example "GPT-5.4 nano") and the two price fields (for example 0.20 and 1.25).

**Testing (done by me, each live run needs your approval)**
8. Run the same 5 fake-customer scripts used for Gemini: book a cleaning, unqualified request, upset customer (handoff), time already taken, emergency.
9. Check that the right tools were called, no invented prices or times, and the handoff promise was used.
10. Compare the Usage Log and the OpenAI usage dashboard with the Gemini results.

**Go / roll back**
11. If everything passes, keep it. If not, use workflow 1 → **Version history → restore** the Gemini version. That takes 1 minute; nothing else is affected.

**Optional later:** connect both models (OpenAI first, Gemini as backup), so chats keep working if one company has an outage.

## 7. Keeping each client's customer data separate

| Rule | How it is done |
|---|---|
| One copy of the Main Chat Agent per client | Duplicate workflow 1; give it a unique `clientId` in Business Settings |
| One Google Sheet per client | `leadSheetUrl` in Business Settings. The tool workflows write **only** to the sheet they are given. |
| One calendar per client | `calendarId` in Business Settings (share the client's calendar with the agency Google account) |
| Separate conversation memory | Memory key = `clientId` + conversation ID, so two clients can never share a conversation |
| Usage log holds no customer data | Only IDs and numbers |
| Owner alerts go to that client's owner | `ownerEmail` in Business Settings |
| Separate AI usage per client (later) | One OpenAI project or Gemini key per client |
| Shared tool workflows 2–4 | Fine for the demo. For clients with stricter privacy needs, give each client its own copy of the tool workflows and its own Google login. |

**Checklist when adding a new client** (a wrong sheet link would put Client B's customers in Client A's sheet):
- [ ] New `clientId` (never reuse one)
- [ ] New sheet link, with `Leads`, `Usage Log` and `Error Log` tabs
- [ ] New calendar ID
- [ ] New owner email
- [ ] Approved info, services and rules rewritten for this client
- [ ] One test chat, then check the row landed in the right sheet

The Error Logger (workflow 5) sends alerts to the **agency**, not the client. Error messages can sometimes include customer details, so keep that inbox private.

---

### Sources (web search, 2026-11-15; official pages could not be opened from this session)
- [Gemini API pricing (Google)](https://ai.google.dev/gemini-api/docs/pricing) · [Gemini rate limits (Google)](https://ai.google.dev/gemini-api/docs/rate-limits) · [Gemini free tier overview (third party)](https://www.aifreeapi.com/en/posts/google-gemini-api-free-tier)
- [n8n sub-workflows: executions don't count (n8n docs)](https://docs.n8n.io/flow-logic/subworkflows/) · [n8n support FAQ on executions](https://support.n8n.io/article/can-you-reset-my-executions) · [n8n pricing summary (third party)](https://coworker.ai/blog/n8n-pricing)
- [Introducing GPT-5.4 mini and nano (OpenAI)](https://openai.com/index/introducing-gpt-5-4-mini-and-nano/) · [OpenAI pricing summary (third party)](https://spendlint.dev/pricing/openai-api)
