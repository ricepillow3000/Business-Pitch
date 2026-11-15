# JIDO — Intelligent workflows for local businesses

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

64 checks: loader choreography, HUD bars + section label, cursor brackets, magnetic button, in-page navigation without reloads, every section's reveals, phone layout, reduced motion, zero JS errors, **and the 20 UX & animation principles below**.

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
| `lib/contact.ts`, `components/ContactMenu.tsx` | Email address + Gmail link (no mailto, so Outlook never opens) |
