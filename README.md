# JIDO — AI agents for local business

Immersive agency site: Marathon-poster art direction, Lusion-style WebGL.
Full design + engineering blueprint: **[docs/BLUEPRINT.md](docs/BLUEPRINT.md)**.

## Run locally

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. Add `?q=low` to force the lightweight tier (weak GPUs).

## Build (static)

```bash
npm run build
```

Outputs a fully static site to `out/`. Not deployed anywhere yet.

## Where things live

- Brand + all copy: `lib/config.ts`
- Colours / type scale: `app/globals.css`
- Route → camera poses: `lib/routes.ts`
- 3D hero (moon valley, orb, beam, dust, cyclone): `components/canvas/moon/` (+ the orb's nebula in `components/canvas/ParticleCore.tsx`)
- Info-panel copy for the clickable orb / storm: `lib/config.ts → INFO`
- Loader, cursor, HUD, page counter, hotspots, info panel: `components/dom/`
- Visual / interaction tests (Playwright, run against `npm run dev`): `tests/visual/` — e.g. `node tests/visual/interact.cjs <outdir>`
- Page transitions: `components/transition/`
