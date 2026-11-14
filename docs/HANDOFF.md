# HANDOFF: JIDO site → "Moon, Orb & Storm" hero redesign

> Written at the end of a long session so a fresh session can continue without its history.
> **Read this whole file before touching code.** The approved plan is §3.

---

## 1. Ground rules from the user (non-negotiable)

- **Localhost only. Never deploy anything without the user's explicit go-ahead.** Cloudflare is connected to the environment, but do not use it until told.
- Work on branch **`claude/vigilant-mendel-r6zlq8`**: commit there and push there. The repo has **no `main` branch**, so a PR can't be opened. Don't create `main` unless asked.
- Run the dev server with `npx next dev -p 3000` in the background, and tell the app about port 3000 (the `report_preview_port` tool) so the user can preview it.
- **Reply style the user asked for:** do the work first, then give a simple summary a 6th grader can understand, plus a simple visual (ASCII diagram or screenshots).
- Art direction: high-end editorial / luxury reveal (Apple, designer campaign). Marathon-poster typography × Lusion-grade WebGL motion.
  - **Never "gamer RGB"**: no rainbow chromatic aberration, no neon sludge bloom, no starfield-demo clichés.
  - **No default ambient lights.** No neon circle/disc behind the subject.
- Brand name: **JIDO** (`lib/config.ts → BRAND`). Email placeholder `hello@jido.agency`. Prices are `$—` placeholders and the case studies are clearly marked placeholders. Never invent testimonials.
- **Tabular lining numerals** sitewide (already in `app/globals.css`).

## 2. The request this handoff is for

The user **scrapped the porcelain mannequin**: it didn't fit the first page, and procedural faces looked uncanny. The new hero:

- **Setting:** an exoplanet/moon. The background must be **dark slate GRAY**. The current `#152626` reads as green to the user, so make it a neutral gray.
- **Orb:** a **bright orb** sits dead centre and **shines a beam of light down** onto the ground.
- **Ground reaction:** the floor reacts to the light as if **a powerful gust of wind** blasts outward from the impact, and **dust spreads apart**.
- **Cyclone:** directly under the orb, an **ethereal cyclone/tornado**.
- **Clickable:** **click the orb → info panel. Click the cyclone → info panel.** The UI must **tell users these are clickable** so they're not lost.
- **Intro:** when loading finishes (the user typed "200%" and meant the end of loading), the JIDO name **approaches the viewer as if reaching through the screen**, **splits like a curtain**, and at the same time the orb scene is revealed **at the same speed as the website** fades in.
- **Layout** (see `docs/reference/whiteboard-sketch.jpg`, the user's own sketch):
  - `[[001]]` page counter top-left
  - subject in the middle
  - dot grid top-right
  - "+" registration marks around the frame
  - **body of text bottom-right**
- The user chose to **keep the big headline bottom-left** ("WE BUILD AGENTS THAT DO THE BUSYWORK").
- The user chose: **"you draft"** the panel copy (drafts are in §3).

### Visual reference (described, since uploads don't carry over)

The user's main reference is the **Lusion "About" page hero**:
- A grayscale moon valley at night: rugged ridges rising on the left and right, a pale dusty valley floor in the middle.
- A tiny astronaut standing centre.
- Above, a **sparkling particle nebula/orb** with a dense bright heart, wispy arms, and a few larger soft motes and floating rock fragments.
- Thin "+" marks in a row across the middle.
- Headline bottom-left ("WE ARE LUSION / A CREATIVE / *PRODUCTION STUDIO*"), italic text bottom-right ("*CRAFTING UNIQUE / DIGITAL EXPERIENCES*").
- Scrolling dollies the camera back: the cloud collapses into a beam of light, then the scene fades to black for the statement copy.

The user wants that feel, but with the orb + beam + wind-blown dust + cyclone as the subject.

## 3. APPROVED PLAN

### Remove
- `components/canvas/HeroMannequin.tsx`, `HeroRig.tsx`, `AICore.tsx`, `coreGeometry.ts`, `mannequinGeometry.ts` (if present)
- `scripts/build-mannequin.ts`, `public/models/`
- The `build:model` npm script and the `tsx` + `gltfpack` devDependencies
- `components/dom/HubLabels.tsx` (reuse its 3D → screen projection pattern for the hotspots)

### Reuse
- `components/canvas/ParticleCore.tsx` + `nebulaShaders.ts`: the GPGPU curl-noise particle nebula (GPUComputationRenderer position/velocity FBOs) **becomes the orb body**. Extract its GPGPU setup into `lib/useGpgpu.ts` so the ground dust can share it.
- `shaders.ts` beam shader (cone, additive, view-dependent core) → the light shaft.
- `lib/motion.ts`, `lib/intro.ts`, `lib/routes.ts`, `components/dom/Preloader.tsx` (master timeline), `components/transition/*`, `PageCounter`, `Hud`, `Cursor`, `Reveals`, and the render pipeline in `components/canvas/Scene.tsx` all stay.

### Build `components/canvas/moon/`

| File | What it does |
|---|---|
| `MoonScene.tsx` | Replaces HeroRig: route stage pose, intro reveal, composes the parts below, sets `useStore.setSceneReady()` after 3 frames, writes `focusPoint` (DOF) = orb |
| `moonShaders.ts` | Shared GLSL: **`terrainHeight(xz)`** (single source of truth for terrain + dust + impact), fbm, craters, cyclone/dust/impact shaders |
| `Terrain.tsx` | Big plane (high 384², low 192² segments), displaced in the vertex shader by `terrainHeight`: regolith, craters, side ridges like the reference. MeshStandardMaterial (rough dark-slate regolith) patched via `onBeforeCompile` with an **impact glow** + **animated radial wind streaks** rippling outward from the beam hit. Normals by finite differences in the shader. |
| `Orb.tsx` | `<ParticleCore/>` + soft halo sprite + **PointLight** that lights the ground. Hover → brighter and more turbulent. |
| `LightBeam.tsx` | Cone orb → ground with scrolling noise, an impact flare disc on the ground, and a **SpotLight** down the beam (real light pool). |
| `GroundDust.tsx` | GPGPU dust (high 256², low 128²): **radial outflow from the impact** + gust pulses + curl turbulence. Particles hug `terrainHeight`, get kicked up near the beam, settle as they fly out, and respawn near the impact. |
| `Cyclone.tsx` | Analytic vertex-shader vortex (high ~40k, low ~15k particles + a few faint helical ribbons). Funnel ground → orb: angular speed ∝ 1/r, upward drift, noise wobble, ethereal Flag Blue ↔ Beige. Hover spins it up. |
| `Sky.tsx` | Backdrop gradient (dark slate zenith → hazy horizon), sparse stars, a handful of slow floating rock fragments, slate-gray fog |

- **Lighting:** no ambient. The orb PointLight + beam SpotLight carry the scene, plus a faint cool directional "moonlight". The monochrome env stays at low intensity.
- **Bloom:** `<Select enabled>` only on the orb particles, beam, impact flare and cyclone.
- **DOF:** focus on the orb.

### Interaction + discoverability (`components/dom/`)
- `Hotspots.tsx`: two real `<button>`s projected each frame onto the orb and the cyclone.
  - Each has a pulsing ring + label: `◉ THE CORE · CLICK` and `◉ THE ENGINE · CLICK`.
  - They're keyboard-focusable with aria labels and work on touch.
  - Invisible raycast proxies in 3D too, so clicking the visuals works.
  - On hover, the cursor ring shows "OPEN" (the `data-cursor-label` attribute) and the object reacts.
- `HintToast.tsx`: after the intro, "Tap the orb or the storm to explore". It hides after the first interaction; remember that in localStorage, wrapped in try/catch.
- `InfoPanel.tsx`: a Marathon-styled panel that slices in from the right (clip-path), with a title, body, 3 bullets and a "Book an audit" CTA (TransitionLink to `/booking`).
  - Esc, ✕ or an outside click closes it.
  - Trap focus while it's open, stop Lenis (`lenisRef.current.stop()`), and ease the camera toward the clicked object.
- Copy in `lib/config.ts → INFO` (drafted; the user can edit):
  - **The JIDO Core:** "One AI brain shared by every agent you hire. It learns your business, your tone and your rules, so every call, booking and invoice sounds like you."
  - **The Workflow Engine:** "Calls, bookings, invoices and follow-ups get pulled in, handled and sent back out, around the clock. You only see what needs a human."

### Intro sync (`Preloader.tsx` + `lib/intro.ts` + `lib/motion.ts`)
1. 100% → `.loader-word` rushes toward the viewer (scale ≈ 5.5, `expo.in`).
2. Seam + stepped glitch → the curtain halves part.
3. At the `open` label, tween one value, **`motion.reveal` 0→1** (orb ignites, beam strikes, dust bursts outward, cyclone spins up, camera settles). It must use **the same position + duration + window as the UI `autoAlpha` fade** (`UI = [#page, [data-chrome]]` elements).
4. Replace `approach/crack/split` (mannequin-specific) with `reveal`.
5. Reduced motion: no simulation, static reveal.

### Hero layout + palette
- `components/sections/Hero.tsx`: headline bottom-left (keep `.hero-title` + SplitText entrance), body copy + CTA **bottom-right**. Remove the mannequin hero shift; centre on the orb.
- `components/dom/Hud.tsx`: add a dot grid top-right (the "+" marks + `[[001]]` already exist).
- **Palette** → neutral dark slate gray, approx. `--color-void #14181b`, `--color-slate #2b3237`, `--color-slate-deep #1e2428`.
  - Update `app/globals.css` `@theme`, `COLORS` in `components/canvas/shaders.ts`, fog, backdrop, the `viewport.themeColor` in `app/layout.tsx`, and the loader radial gradient.
  - **Re-check contrast:** Signal Blue `#6e9bf0` and Beige `#f5f5dc` on the new void must be ≥ 4.5:1. Flag Blue `#0a3161` is only for color-blocks / text on beige.
- **Hero scroll** (`motion.hero` 0→1): the camera dollies back and up to reveal the vast moonscape. The orb + beam + storm become a small lit point in the valley (as in Lusion), the scene dims, and the statement copy reveals. The CTA section returns to the orb (`motion.cta`).
- **Route poses** (`lib/routes.ts`): Pricing (orb to the left), Booking (far and high, dim). The `Stage` keys are named `brainX/brainY/...`; rename them to `subjectX`... or similar.

### Performance tiers
- **High:** orb 512², dust 256², cyclone 40k, terrain 384², DOF + MSAA.
- **Low** (`?q=low`, ≤768px, or PerformanceMonitor decline): orb 256², dust 128², cyclone 15k, terrain 192², no DOF/MSAA.
- Everything is procedural; nothing to download.

### Docs
Rewrite `docs/BLUEPRINT.md` §3 (motion design & WebGL: the moon scene), the §4 hero row and the §1 perf budget, plus the README "where things live".

## 4. Architecture map (what already exists)

- `app/layout.tsx` → `components/Shell.tsx` (mounted once, **never unmounts**). It holds the persistent R3F canvas (`components/canvas/CanvasRoot.tsx` → `Scene.tsx`), the cursor, WarpFilter, SmoothScroll (Lenis on `gsap.ticker`), the Preloader, and `TransitionProvider` (route slices + camera choreography) with chrome = `Hud` + `PageCounter`, plus `Footer`.
- **Frame bridge:** `lib/motion.ts`, a plain mutable object. GSAP/DOM write it, R3F `useFrame` reads it, and nothing re-renders.
  - Fields: `hero`, `cta`, `intro`, `homeWeight`, `stage` (route pose, GSAP-tweened), `velocity`, `pointer`, `pointerUv`, `pointerSpeed`, `hoverBoost`.
  - `focusPoint` (Vector3 for DOF).
  - `hubLabelEls` (remove with HubLabels).
- `Scene.tsx` contains:
  - `Backdrop` (fullscreen gradient quad)
  - `CameraRig`: home scroll choreography blended with the route `stage` by `homeWeight`
  - `FocusSync` (DOF target)
  - studio `Environment` (Lightformers), key + rim directional lights (`rimLight` ref is passed to SelectiveBloom)
  - the `<Selection>` + `EffectComposer` pipeline: `DepthOfField` (high only) → `LensEffect` (cursor lens) → `SelectiveBloom` (`ignoreBackground`) → `ToneMapping ACES_FILMIC` → `Noise` → `Vignette`
  - `quality` state ("high"/"low") and `?q=low`
- `components/dom/Preloader.tsx`: the master intro timeline (GSAP owns easing; R3F only reads `motion.*`). Uses `contextSafe`, and the UI elements are real nodes (see gotcha 2).
- `components/transition/TransitionProvider.tsx`: click → `choreograph(target)` tweens `motion.stage` + `homeWeight` immediately → `#page` clip-path slices shut → `router.push` → on pathname change, slices open + `[data-enter]` line reveals. Prefetch on hover and on idle.
- `components/dom/PageCounter.tsx`: `[[00X]]` roams to a new position each `[data-section]`. `POSITIONS[0]` is top-left, `[1]` bottom-left, etc.
- `components/dom/Reveals.tsx`: declarative scroll reveals (`data-split`, `data-mask`, `data-scale`, `data-strike`).
- Sections live in `components/sections/*`; copy lives in `lib/config.ts`.
- **Dev-only hooks (keep them):**
  - `window.__motion` (SmoothScroll)
  - `window.__r3f` (R3F state, set in HeroRig; re-add in MoonScene)
  - `window.__simSteps` (extra GPGPU steps per frame in ParticleCore; for headless fast-forward)

## 5. Gotchas already paid for (do not rediscover)

1. **`<shaderMaterial uniforms={...}>` in JSX freezes numeric uniforms** in this R3F version. Always `useMemo(() => new THREE.ShaderMaterial({ uniforms, ... }))` and pass `material={...}`. Verify uniforms update with `tests/visual/dbg2.cjs`.
2. **useGSAP `scope`** makes selector *strings* resolve only inside the scope. For elements outside it (`#page`, `[data-chrome]`), pass real elements.
3. **`gsap.killTweensOf(el)`** kills the master timeline's tweens on that element too. Kill specific props only: `killTweensOf(el, "clipPath")`.
4. **Tailwind v4:** `text-[clamp(...)]` can silently fail. Use `@theme` tokens (e.g. `--text-hero`) or `text-[length:clamp(...)]`.
5. **SelectiveBloom** wants a non-empty `lights` array (pass any light ref) and `e.ignoreBackground = true` via the ref, or the background color blooms into a haze.
6. **Additive particle brightness:** hundreds of particles overlap at the core. Calibrate per-particle intensity to ~0.002–0.02 and keep the total roughly constant across tiers (`× 262144 / count`). Boost sparse outskirts by radius.
7. **GPGPU:** `GPUComputationRenderer` from `three/examples/jsm/misc/GPUComputationRenderer.js`. Use HalfFloat if `!gl.extensions.has("EXT_color_buffer_float")`.
8. **Cursor lens chromatic aberration** must stay a whisper (`LensEffect.tsx`). The user explicitly rejected rainbow rings.
9. **Headless testing:** Chromium + SwiftShader runs at ~2 fps.
   - Use `?q=low`, give screenshots a `timeout: 90000+`, and set `window.__simSteps = 20–25` to fast-forward simulations.
   - Use `window.__motion` to freeze-frame states.
   - Screenshots look rougher than a real GPU; say so to the user.
10. **Blocked actions (auto-mode classifier):** `npx -y <package>` of unvetted tools, `pip install`, and `rm` with globs/variables were denied.
    - Ask the user first; prefer safe alternatives (numpy/PIL are available; use mkdir for new output dirs instead of deleting).
    - **sciencefocus.com is not reachable** from this sandbox (DNS).
11. Chat-pasted images are **not saved to disk**; only attached files land in the session's uploads folder. If you need an image's pixels, ask the user to attach it as a file.
12. Next 16 writes an `AGENTS.md` block on `next dev`; committing it keeps the tree clean.
13. React 19 + drei `<Html>` produced an "unmount while rendering" error, so labels are DOM nodes projected manually instead.

## 6. Verification checklist (from the plan)

1. `npx tsc --noEmit` and `npx next build` (static export to `out/`).
2. Start the dev server, then run the visual tests in `tests/visual/` (CommonJS, Playwright is preinstalled globally; `BASE` env overrides the URL):
   - `node tests/visual/nav.cjs <outdir>`: route transitions, same `<canvas>` persists, no errors.
   - `node tests/visual/shoot.cjs <outdir>`: full scroll journey screenshots.
   - `node tests/visual/intro2.cjs <outdir>`: intro sync (**update it** to measure `motion.reveal` vs the UI fade; it currently measures the mannequin's `approach`/`split`).
   - `node tests/visual/neb.cjs <outdir>`: pattern for cursor sweep + click interaction (adapt to the hotspots).
   - `node tests/visual/dbg2.cjs`: proves shader uniforms are live (adapt the selectors).
3. New tests:
   - hotspot buttons open the correct panel;
   - Esc closes it;
   - Tab reaches both hotspots;
   - clicking the orb visual (raycast) opens a panel;
   - the hint toast appears, then hides after the first interaction.
4. Contrast script for the new palette (WCAG formula; a ≥ 4.5:1 target for text colors on void).
5. Commit + push to `claude/vigilant-mendel-r6zlq8`. **No deploy.** Summarise for the user in the 6th-grade style with a visual.

## 7. State of the repo at handoff

- The last feature commit has the porcelain mannequin + GPGPU particle-nebula core + JIDO rebrand + gltfpack-compressed GLB.
- An uncommitted SDF-sculpt mannequin experiment existed only in the old session's working tree. It is **intentionally abandoned**, so the new session starts from the pushed branch.
- Earlier session screenshots aren't available; re-shoot as needed.
