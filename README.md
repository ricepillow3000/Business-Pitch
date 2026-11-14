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

Open http://localhost:3000. Add `?q=low` to force the lightweight glass (weak GPUs).

## Build (static)

```bash
npm run build
```

Outputs a fully static site to `out/`. Not deployed anywhere yet.

## Where things live

- Brand + all copy: `lib/config.ts`
- Colours / type scale: `app/globals.css`
- Route → camera poses: `lib/routes.ts`
- 3D hero (mannequin + AI core): `components/canvas/`
- Rebuild the 3D model: `npm run build:model` (procedural sculpt → gltfpack-compressed GLB)
- Loader, cursor, HUD, page counter: `components/dom/`
- Page transitions: `components/transition/`
