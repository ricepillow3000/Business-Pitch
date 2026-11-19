# JIDO website: session handoff

Read this first in a new session. It covers what the site is, what was built, how to run and
test it, the rules the owner set, and what is still open. Last updated at build **1.7.2**
(+ brand files), branch `claude/eloquent-einstein-qdskm6`.

---

## 1. What this is

- **JIDO**: an AI automation agency site. Footer line: "JIDO. An AI automation platform developed and operated by John Nguyen."
- **Stack**: Next.js 16 (static export to `out/`), React 19, Tailwind v4, GSAP, Lenis. Read `AGENTS.md`: this Next.js has breaking changes; check `node_modules/next/dist/docs/` before writing Next code.
- **Look**: Marathon HUD / Lusion style. Dark slate background, beige text, "flag" blue accents, chamfered beige buttons, corner brackets, mono labels.
- **Git**:
  - Work branch: `claude/eloquent-einstein-qdskm6`.
  - Draft PR: https://github.com/ricepillow3000/Business-Pitch/pull/4 (base `claude/vigilant-mendel-r6zlq8`).
- **Owner preference**: do the work, then give a short summary a 6th grader can follow, plus a simple visual (ASCII diagram or table).

## 2. Owner rules (still in force)

- **Do not**:
  - deploy the site publicly (owner said "Not yet"), change DNS, or buy anything;
  - activate or publish workflows;
  - transmit real customer data;
  - publish the n8n contact workflow without the owner's explicit approval.
- **No made-up claims**:
  - Do not fabricate legal compliance, business details, email addresses, prices, refund policies, guarantees or contract terms.
  - Do not say a service is used unless it is really integrated.
  - Do not promise security, deletion, retention or confidentiality the implementation doesn't support.
  - Never call the platform HIPAA compliant.
  - The legal pages are not legally approved just because they are built: an attorney must review them.
  - Do not copy another company's privacy policy.
- **Email**:
  - The site's contact email is `john7000.nguyen@gmail.com`, already in `lib/contact.ts`.
  - Never put the owner's personal email into code, commits or external services.

## 3. Key settings (one place to change things)

| File | Setting | Current value |
|---|---|---|
| `lib/site.ts` | `url` | `null` (no domain yet; adds canonical + share image when set) |
| `lib/site.ts` | `bookingUrl` | The owner's real Google Calendar appointment schedule ("Discovery call", Website embed `src`) |
| `lib/site.ts` | `bookingDaysOff` | `["Thu", "Sat", "Sun"]` (hatched on the `/book` week; keep in step with Google Calendar) |
| `lib/site.ts` | `contactEndpoint` | n8n webhook `https://jido-api.app.n8n.cloud/webhook/jido-website-contact` (workflow NOT published, so the form falls back to a Gmail draft) |
| `lib/site.ts` | `prices` | from $399 setup / $199 a month (plain text only) |
| `lib/contact.ts` | `SHOW_EMAIL` | `false`: the address is hidden on home, contact and footer for now (owner's request). Gmail buttons and the form still reach it. |
| `lib/legal.ts` | `operatorName` | "John Nguyen" (owner to confirm it is the exact legal name) |
| `components/HUD.tsx` + `start-windows.bat` | build number | 1.7.2 (bump both on each release) |

## 4. What was built (most recent first)

- **Brand** (`brand/`):
  - Google profile pictures, 1024×1024: `jido-profile-dark.png` (recommended) and `jido-profile-light.png`.
  - `brand/options/`: three light **gradient** tries (soft, bold, glow) plus `gradient-preview.png`. **The owner hasn't picked one yet.** Bold (B) was recommended.
  - The generator scripts are alongside them.
- **Booking page `/book`** (built from the owner's paper sketch):
  - Layout:
    - Week calendar Mon–Sun in a HUD frame, with Thu, Sat and Sun hatched "Unavailable". "On the call." list on the right.
    - "Prefer to write?" and "Request a call in Gmail" were removed on purpose.
  - How booking works:
    - "Show available times" loads the owner's live Google Calendar inside the frame.
    - Visitors book there; Google sends the confirmation. No Gmail, no new tab.
    - Nothing loads from Google before that click, because the Privacy policy promises it. The owner was offered an "auto-load" option, which needs a Privacy policy wording change; no answer yet.
  - Google Calendar is set up as: 15-minute calls, 15-minute buffer, max 16 a day, Mon/Tue/Wed/Fri. Suggested window: 30 days ahead, 12 hours' notice.
- **Cursor** (`components/Cursor.tsx`):
  - The JIDO cursor is a 10px beige dot plus a viewfinder with 4 corner ticks, using blend-difference so it shows on any background. It is glued to the pointer and boxes links and buttons on hover. Nothing on the page moves toward it; the main button stays still.
  - Touch, phones and DevTools phone mode: the same cursor appears at the finger, boxes the tapped button, then fades.
  - Over the Google calendar (and its frame plus a 2rem margin, `data-native-cursor`) it steps aside and the normal system pointer shows. This is decided on every move, with fallbacks (pointerout, window blur, and a recheck when the boxed element is removed).
- **Other changes**:
  - Top bar links are 12px.
  - The email address is hidden (`SHOW_EMAIL`).
  - Home hero spacing is fixed (no empty half-screen).
  - Footer operator line.
  - The "20 ways to unslop" pass.
  - Launch pages: services, pricing, contact, book, privacy, terms, AI disclosure, legal contact.
  - Metadata via `pageMeta()`, manifest, icons, OG image.
- **n8n** (instance `jido-api.app.n8n.cloud`):
  - Workflow `N1PRPdxPmwsQiKkI` "[TEST] JIDO Website - Contact Form" is **inactive**.
  - It writes to the demo sheet "JIDO Website Inquiries (DEMO TESTS)" and emails the site address.
  - Demo sends were all tested and delivered.
  - Do not publish it without approval.

## 5. Run and test

```bash
npm install
```
```bash
npm run build
```
```bash
npx serve out -l 4173
```

Each suite takes the base URL, and all of them passed at build 1.7.2:

| Test | Checks | Result |
|---|---|---|
| `node tests/verify.cjs http://localhost:4173` | Whole site, UX laws, contrast, slop scans | 145/145 (4 skipped while `SHOW_EMAIL` is off) |
| `node tests/contact-journeys.cjs http://localhost:4173` | Every contact path | 22/22 |
| `node tests/cursor-touch.cjs http://localhost:4173` | Cursor on phones and touch | 8/8 |
| `node tests/hero-spacing.cjs http://localhost:4173` | Home first screen spacing | 7/7 |
| `node tests/booking-journey.cjs` | Home to booked in 5 clicks (Google answered by a labelled stand-in) | 7/7 |
| `node tests/booking-cursor.cjs` | Normal pointer over the calendar | 6/6 |

- **Owner's own computer:**
  - Make the zip with `git archive --format=zip -o jido-site-vX.Y.Z.zip HEAD` (`/jido-site*.zip` is git-ignored).
  - The owner unzips it and double-clicks `start-windows.bat`, which serves http://localhost:3000.
- **Network:**
  - The Default cloud environment blocks `calendar.google.com`. A personal environment **"Business-Pitch"** was created that allows `calendar.google.com`, `www.gstatic.com`, `ssl.gstatic.com`, `fonts.gstatic.com` and `fonts.googleapis.com`.
  - Start new sessions on it to load and screenshot the real booking calendar. The real calendar has **not** yet been viewed by Claude; it was only tested with a stand-in.
  - **Update (2026-11-19):** `calendar-pa.clients6.google.com` was added to "Business-Pitch" (the calendar fetches its free times from there). Even so, the real calendar **cannot load in a cloud session**: Google's booking page sends those requests with a `$httpHeaders` query parameter, and the cloud network proxy refuses any Google request that carries it (`403`, header `X-Proxy-Error: ... $httpHeaders ...`). The browser reports it as a CORS error and Google shows "There was an error loading this appointment page". This is a proxy safety rule, not a site bug and not an allowlist gap; no environment setting changes it. (`play.google.com` is also blocked; it is only Google's usage logging and not needed.)
  - To see or test the real calendar, use the owner's own computer (the zip + `start-windows.bat`, then open `/book`), or the live Google link directly.

## 6. Open items (waiting on the owner)

1. **Pick a profile picture**: a gradient option (A soft, B bold, C glow) or the plain dark/light version.
2. **Test the real booking calendar** on `/book`: book one test call, check the confirmation email, then delete it.
3. **Auto-load the calendar?** Optional. It needs a Privacy policy wording change.
4. **Publish the n8n contact workflow.** Needs explicit approval, plus the real inquiries sheet instead of the demo one, and CORS limited to the real domain.
5. **Domain and deploy.** On hold ("Not yet"). Then set `SITE.url`.
6. **Attorney review** of the legal pages (`docs/legal/LEGAL-REVIEW.md` has the checklist).
7. **Final pricing terms** (`docs/business/PRICING-PROPOSAL.md`).
8. **Confirm "John Nguyen"** is the exact legal operator name.
9. **Show the email again?** When the owner wants it: set `SHOW_EMAIL = true`.
10. The owner may delete the ~10 "[DEMO TEST]" emails in the site inbox.
