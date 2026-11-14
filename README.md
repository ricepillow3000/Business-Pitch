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

## Prove it works

With the dev server running (needs Playwright: `npm i -D playwright && npx playwright install chromium`):

```bash
node tests/verify.cjs http://localhost:3000
```

30 checks: loader choreography, HUD pagination, cursor brackets, magnetic button, in-page navigation without reloads, every section's reveals, phone layout, reduced motion, zero JS errors.

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
| `components/HUD.tsx` | Crosshairs, edge micro-data, `[[00X]]` slot-machine pagination |
| `components/Cursor.tsx` | Fluid blend-mode node → Flag Blue `[ ]` brackets, magnetic targets |
| `components/SmoothScroll.tsx` | Lenis on GSAP's ticker; `#anchor` links scroll smoothly |
| `components/WorkflowGraph.tsx` | [[003]] SVG automation map |
| `components/Logo.tsx`, `app/icon.svg` | Logo mark + wordmark, favicon |
| `app/page.tsx` | The four sections + their scroll reveals |
