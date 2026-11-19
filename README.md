# JIDO: intelligent workflows for local businesses

> **New session?** Start with [`docs/HANDOFF.md`](docs/HANDOFF.md): current state, owner rules, how to test, open items.


One-page agency site. Marathon-style HUD art direction, Lusion-style motion.
Next.js 16 (static export) · GSAP 3 (ScrollTrigger, SplitText, CustomEase, ScrambleText) · Lenis · Tailwind v4.

## Run locally

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000

### On Windows (easiest)

Double-click **`start-windows.bat`**. It installs everything the first time, starts the site and opens http://localhost:3000. Close the black window to stop it.

### On Windows (PowerShell)

PowerShell blocks `npm` by default ("running scripts is disabled on this system").
Type `npm.cmd` instead of `npm`. It does the same thing and is never blocked:

```powershell
npm.cmd install
```

```powershell
npm.cmd run dev
```

Run these inside the project folder, not in `C:\WINDOWS\System32`. The easy way to get there is to open the folder in File Explorer, click the address bar, type `powershell` and press Enter.

## Prove it works

With the dev server running (needs Playwright: `npm i -D playwright && npx playwright install chromium`):

```bash
node tests/verify.cjs http://localhost:3000
```

145 checks: loader choreography, HUD bars + section label, cursor brackets, magnetic button, in-page navigation without reloads, phone layout, reduced motion, zero JS errors, **the 20 UX & animation principles**, **the 20 design terms**, **the no-AI-slop scan**, **the 20 ways to unslop**, **the legal pages** and **the Services / Pricing / Book / Contact pages** below.

### Every way to reach out

```bash
node tests/contact-journeys.cjs http://localhost:3000
```

22 journeys, clicked like a visitor:
- each of the 6 suggested tasks, a task in the visitor's own words, and no task
- the Contact page directly
- server-side field errors
- the Gmail fallback when sending fails or n8n is unreachable
- the booking page (books on the page, never via Gmail)
- every email link (all Gmail compose, no mailto)

`tests/booking-cursor.cjs` checks the normal mouse pointer over the Google calendar (no JIDO cursor trailing) and the JIDO cursor everywhere else.

`tests/booking-journey.cjs` walks a visitor from the home page to a booked call (5 clicks). It needs a build with `bookingUrl` set; Google is answered by a clearly labelled stand-in, so nothing real is booked.

The form's request is intercepted, so nothing is sent.

### Cursor on touch, and first-screen spacing

```bash
node tests/cursor-touch.cjs http://localhost:3000
node tests/hero-spacing.cjs http://localhost:3000
```

- **Cursor on touch:** the JIDO cursor appears on a finger tap, including in Chrome DevTools phone mode and on touchscreen laptops.
- **First-screen spacing:** after the logo loads the home page, no empty band covers more than 25% of the screen. Checked on 3 phones, a tablet and 3 desktop sizes.

## Launch settings (`lib/site.ts`)

| Setting | Now | What it does |
|---|---|---|
| `url` | `null` | The real domain once owned. Adds canonical links and the share image (`public/og.png`). |
| `bookingUrl` | set (Discovery call schedule) | Google Calendar appointment schedule (Share → Website embed → Inline → copy the `src` address). Shown as the week calendar on `/book`, where visitors pick a time and book on the page. While empty, `/book` shows the week saying online booking opens soon. |
| `bookingDaysOff` | Thu, Sat, Sun | Days hatched as unavailable on the `/book` week before the live calendar loads. Keep in step with Google Calendar, which decides what can really be booked. |
| `contactEndpoint` | n8n webhook | The contact form posts here. The n8n workflow is **not published yet**, so the form falls back to a Gmail draft. |
| `prices` | from $399 / $199 a month | Shown as plain "from" text on `/pricing`. Exact terms: `docs/business/PRICING-PROPOSAL.md`. |

## UX & animation principles (enforced)

Every principle has a check (`UX 01` … `UX 20`) in `tests/verify.cjs`. If a change breaks one, the run fails.

| # | Principle | Where it lives |
|---|---|---|
| 1 | Squash & stretch | Cursor dot stretches along fast moves; the CTA face squashes to 96% on press |
| 2 | Anticipation wind-up | Loader "reach" before the split; CTA arrow pulls back while pressed |
| 3 | Staging the focus | One primary button, text on quiet halos, one section label at a time |
| 4 | Pose to pose | Intro key poses: 100% → reach → split → hero |
| 5 | Follow through | Email menu rows settle in one after another; magnetic button springs back |
| 6 | Slow in & slow out | Custom eases (`reach`, `split`) and `--ease-expo`; nothing UI-facing is linear |
| 7 | Moving in arcs | Workflow wires are curves, so data packets travel in arcs |
| 8 | Secondary action | Packets flow, hub ring turns, HUD label scrambles |
| 9 | Snappy timing | Every hover / press / menu transition is 500ms or less |
| 10 | Exaggerated feedback | "Copy address" flips to "Copied ✓" and lights up |
| 11 | Solid drawing (layering) | Open menu sits cleanly above the content; HUD bars mask what scrolls under them |
| 12 | Overall appeal | All text uses the brand palette only (beige, flag blue) |
| 13 | Fitts's law | Main button is a big target (≥ 200 × 60px) |
| 14 | Bigger hit areas | `.hit` gives small text links an invisible ≥ 44px hit area |
| 15 | Hick's law | Two email choices, two links in the top bar |
| 16 | Miller's law | No list longer than 7 items |
| 17 | Doherty threshold | Clicks answer in < 400ms; repeat visits get a quick intro |
| 18 | Postel's law | Copy falls back to select-and-copy when the clipboard API is blocked |
| 19 | Jakob's law | Logo top-left → home, Contact top-right, new-tab links marked ↗ |
| 20 | Frequency of use | Contact stays visible, one click away, at every scroll position |

## 20 design terms (enforced)

Checks `D01` … `D20` in `tests/verify.cjs`.

| # | Term | Where it lives |
|---|---|---|
| 1 | Kerning | `font-kerning: normal` + `optimizeLegibility` on the whole page |
| 2 | Optical centre | Intro word sits a little above the true middle (`data-optical`) |
| 3 | Tabular numbers | `tabular-nums` everywhere: intro %, SCR readout |
| 4 | Layout shift | Measured CLS under 0.05 (self-hosted fonts, transforms only) |
| 5 | Tracking | Display type tight (−0.03em), HUD labels open (+0.16em) |
| 6 | Optimistic update | "Copied" shows instantly, reverts only if every copy method fails |
| 7 | x-height | Lowercase reading text is at least 7px tall at its x-height |
| 8 | Touch target | Every link, button and field catches a tap 20px from its centre (phone) |
| 9 | Leading | Paragraphs 1.4 to 1.8, headlines 1.15 or less |
| 10 | Origin-aware animation | Email menu grows from its button (`origin-top-left`) |
| 11 | OKLCH | Brand colours defined in OKLCH in `@theme` |
| 12 | Widow | `text-wrap: balance` on headings, `pretty` on paragraphs; checked line by line |
| 13 | Safe area | `viewport-fit=cover`; HUD bars and gutters pad with `env(safe-area-inset-*)` |
| 14 | Stagger | Hero lines, reveals and menu rows enter one after another |
| 15 | Line length | Reading lines 80 characters or less (`52ch` on legal pages) |
| 16 | Affordance | Links in text are underlined; the CTA is a solid button |
| 17 | Combobox | "What should run on its own?" (`components/TopicCombobox.tsx`) fills the email subject |
| 18 | Interruptible animation | Click/key/scroll fast-forwards the intro; menus reverse mid-way |
| 19 | Progressive disclosure | Suggestions, email options and the phone table of contents open on demand |
| 20 | Shared element transition | Footer legal link morphs into the page title (`@view-transition`) |

## Legal pages (drafts)

`/privacy`, `/terms`, `/ai-disclosure` and `/legal-contact`, built from `components/LegalPage.tsx`. Business details live in `lib/legal.ts`; anything still missing shows as a marked `[placeholder]`, and every page carries a draft notice until an attorney has approved it. **Read `docs/legal/LEGAL-REVIEW.md` before publishing**: it lists what was verified, unsupported claims to check, the placeholders, missing safeguards in the automation, a pre-launch checklist and questions for counsel.

## No AI slop (enforced)

The site is scanned for the usual "AI-made website" tells, on the home page and both legal pages. Any hit fails the run.

| Not allowed | How it is checked |
|---|---|
| Drop shadows, glows, blur | No `box-shadow`, `text-shadow`, `drop-shadow` or `blur` on any element |
| Radial orbs, harsh gradients, gradient text | No `radial-` / `conic-gradient`, no `background-clip: text` (the text backdrop is a feathered rectangle) |
| Liquid glass | No `backdrop-filter` |
| Soft corner radius | Every corner is square (the button uses an angled chamfer) |
| Em dashes, emojis, checkmarks, sparkles | Scanned in the visible text and the page title |
| Inter / Geist / Space Grotesk, Lucide icons | Fonts are Archivo + JetBrains Mono; no icon library |
| Pure white backgrounds, purple, neon, pastel | Slate background; text only in beige / flag blue (see UX 12) |
| Hover animations, animated arrows | No `:hover` rule moves, scales or rotates anything |
| Pricing tiers, fake testimonials, star ratings, bento grids, terminal windows, 3 cards in a row | None on the page; no `blockquote`, prices or ratings |
| No Terms / no Privacy policy | `/privacy`, `/terms`, `/ai-disclosure` and `/legal-contact` exist and are linked from the footer |

## 20 ways to unslop (enforced, every page)

| # | Rule | How it is checked |
|---|---|---|
| 1, 17 | No purple gradient, no gradient backgrounds | No `gradient` in any background; no saturated purple anywhere. The grid is a tiny SVG tile of two hairlines. |
| 2 | Consistent icons, no emojis | Every small icon is one of two 1px line SVGs (crosshair, arrow); no emoji or arrow characters in the text |
| 3, 4 | No Inter, no italic serif word | All text is Archivo or JetBrains Mono; no italics |
| 5 | No headline badge | Nothing sits just above any page's main headline (the HUD names the page) |
| 6 | No 2-button hero | At most one button on any first screen |
| 7 | Outer + inner radius match | Square corners everywhere (0 inside 0) |
| 8 | Colour contrast | Every text measured where it is read: WCAG AA 4.5:1 (large 3:1), placeholders too |
| 9, 12 | No glow, no glass | No shadows, no backdrop blur |
| 10 | No coloured card borders | Every border is a neutral colour (slate line or beige) |
| 11 | No identical cards | No group of 3+ look-alike boxes |
| 13 | Ease up on all-caps labels | Small spaced-out caps only in the HUD readouts; page labels are mono, sentence case, 13px |
| 14 | No stat banner | No row of big numbers |
| 15 | No 1-2-3 steps | The process on `/services` is two short paragraphs |
| 16 | Text wrapping | Headings `balance`, paragraphs `pretty`, no one-word last lines |
| 18 | Not default shadcn | No shadcn classes; own focus ring |
| 19 | No fade-in on every section | Each home section has its own entrance (uncover, word-by-word reading, diagram assembling, headline rise); only one uses opacity |
| 20 | Favicon + meta tags | JIDO mark favicon, home-screen icon, manifest, unique title/description and Open Graph/Twitter tags on every page |

## Build (static)

```bash
npm run build
```

Outputs plain files to `out/`, deployable to any CDN.

## Where things live

| File | What |
|---|---|
| `app/globals.css` | Palette + type tokens (Tailwind v4 config lives here, in `@theme`) |
| `lib/gsap.ts` | Plugin registration + the two custom eases (`reach` / `split`) |
| `lib/intro.ts` | The one-shot "curtain split" signal everything else waits for |
| `components/Loader.tsx` | JIDO intro: count → reach → split |
| `components/HUD.tsx` | Top + bottom bars (content slides under them), crosshairs, edge micro-data, section label |
| `components/Cursor.tsx` | Fluid blend-mode node → Flag Blue `[ ]` brackets, magnetic targets |
| `components/SmoothScroll.tsx` | Lenis on GSAP's ticker; `#anchor` links scroll smoothly |
| `components/WorkflowGraph.tsx` | Automation section: SVG workflow map |
| `components/Logo.tsx`, `app/icon.svg` | Logo mark + wordmark, favicon |
| `app/page.tsx` | The four sections + their scroll reveals |
| `app/privacy`, `app/terms`, `app/ai-disclosure`, `app/legal-contact`, `components/LegalPage.tsx`, `lib/legal.ts` | Legal pages (drafts) + their placeholders |
| `components/TopicCombobox.tsx` | The "What should run on its own?" combobox |
| `lib/contact.ts`, `components/ContactMenu.tsx` | Email address + Gmail link (no mailto, so Outlook never opens) |
