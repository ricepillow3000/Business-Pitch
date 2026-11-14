# JIDO — Frontend Blueprint

B2B AI-automation agency for local businesses.
Marathon-poster art direction × Lusion-grade WebGL motion.
Everything in this document is implemented in this repo: each section points at the real file.

> Brand: **JIDO**. Change `BRAND.name` in `lib/config.ts` and the loader, HUD, footer and metadata all follow.

**Deliverables index**

| # | Deliverable | Section |
|---|---|---|
| 1 | Tech stack & architecture | §1 |
| 2 | Art direction & typography (incl. tabular numerals) | §2, §3.1 |
| 3 | Loader animation logic | §3.2 |
| 4 | WebGL spec: the moon scene (terrain, orb, beam, dust, cyclone), lighting, pipeline | §3.3–3.6 |
| 5 | Homepage wireframe | §4 |
| 6 | Seamless routing, persistent canvas, page counter | §5 |
| 7 | GSAP + R3F sync of the scene reveal and the DOM fade; clickable orb + storm | §3.2, §3.7 |

---

## 1. Tech stack & architecture

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router)**, `output: "export"` | Static HTML/JS, deployable to any CDN. Route-level code splitting + prefetch for free. |
| UI runtime | **React 19** | Required by R3F v9. |
| 3D | **three r180 + @react-three/fiber 9 + @react-three/drei 10** | Declarative scene graph, `useFrame` loop, `Lightformer` env, `PerformanceMonitor`; GPGPU via `GPUComputationRenderer`. |
| Post FX | **@react-three/postprocessing 3 / postprocessing 6** | DOF → custom Lens → SelectiveBloom → ACES ToneMapping → Noise → Vignette (auto-split into passes where convolutions conflict). |
| Shaders | Custom GLSL as TS template strings (`components/canvas/moon/moonShaders.ts`, `nebulaShaders.ts`) | No bundler loader config; shaders tree-shake with their component. |
| Timeline / scroll | **GSAP 3.15** (ScrollTrigger, SplitText, `@gsap/react`) | SplitText is now free; `mask: "lines"` gives the poster line-reveals. |
| Smooth scroll | **Lenis 1.3** driven by `gsap.ticker` | One RAF for Lenis + GSAP + ScrollTrigger. No double loops, no jitter. |
| State | **zustand** (low-frequency: loader phase, open info panel) + **a plain mutable object** (`lib/motion.ts`, per-frame) | React never re-renders at 60fps. The DOM writes `motion.*` and WebGL reads it in `useFrame`. |
| Styling | **Tailwind v4** `@theme` tokens (`app/globals.css`) | Design tokens are the CSS variables; utilities are generated from them. |
| Fonts | Self-hosted via `@fontsource-variable` (Archivo w/ width axis, JetBrains Mono) | No FOUT on the loader, no third-party font requests. |

**Why GSAP, not Framer Motion, for page transitions:** App Router `AnimatePresence` exit animations rely on freezing the router context (`LayoutRouterContext` internals), which breaks between Next versions. The intercepted-link + GSAP timeline approach (section 5) is version-proof and shares one clock with the WebGL choreography.

### Folder structure

```
app/
  layout.tsx            ← mounts <Shell> ONCE (persistent canvas, HUD, cursor, loader)
  page.tsx              ← home: content only
  pricing/page.tsx      ← route with its own 3D pose
  booking/page.tsx      ← route with its own 3D pose + lazy form chunk
  globals.css           ← design tokens + typography utilities
components/
  Shell.tsx             ← the persistent layer stack
  canvas/               ← Scene, ParticleCore (orb nebula), LensEffect, shaders (WebGL only)
    moon/               ← MoonScene, Terrain, Orb, LightBeam, GroundDust, Cyclone, Sky, moonShaders
  dom/                  ← Preloader, Cursor, Hud, PageCounter, Reveals, WarpFilter, SmoothScroll,
                          Hotspots, InfoPanel, HintToast
  transition/           ← TransitionProvider (route choreography) + TransitionLink
  sections/             ← poster sections (Hero, Busywork, Agents, Process, Calculator, …)
  booking/BookingForm   ← split chunk, pre-warmed on idle
lib/
  motion.ts             ← per-frame bridge DOM ⇄ WebGL
  routes.ts             ← route → camera / scene pose table
  config.ts             ← brand + all copy (incl. INFO panel copy)
  useGpgpu.ts           ← shared GPGPU particle setup (orb + dust)
  random.ts             ← seeded PRNG
  spring.ts             ← under-damped spring integrator
  intro.ts              ← intro sync constants
tests/visual/          ← Playwright scripts (intro sync, interaction, nav, journey, uniforms, contrast)
```

### Performance budget

- `dpr` 1.5 desktop / 1 mobile; `PerformanceMonitor.onDecline` (or `?q=low`, or ≤768px) drops to the low tier.

| Tier | Orb | Dust | Cyclone | Terrain | Post |
|---|---|---|---|---|---|
| High | 512² (262k) | 256² (65k) | 40k | 384² segments | DOF + MSAA 4× |
| Low | 256² (65k) | 128² (16k) | 15k | 192² segments | no DOF / MSAA |

- **Zero downloads for 3D**: terrain, sky, rocks and particles are procedural; the env map is baked from `Lightformer`s. The loader's 100% waits for the first three rendered frames.
- Both simulations run entirely on the GPU (2 FBO passes + 1 points draw each). The cyclone has no simulation at all (pure vertex shader). Total ≈ 12 draw calls for the scene.
- No React state in the frame loop. Hotspot positions, HUD numbers and the cursor are written straight to DOM nodes.

---

## 2. Art direction & typography

### Palette (all tokens in `app/globals.css`)

| Token | Hex | Role |
|---|---|---|
| `void` | `#14181B` | Page background: neutral dark slate **gray** (no green cast) |
| `slate` | `#2B3237` | Surfaces, rules, the night sky's horizon haze |
| `slate-deep` | `#1E2428` | Raised cards, the info panel |
| `flag` | `#0A3161` | **Flag Blue**: colour-blocks (Process section), plan chips, text *on beige* |
| `signal` | `#6E9BF0` | Flag Blue's hue lifted for legibility: headers, HUD, data-viz on dark |
| `beige` | `#F5F5DC` | Logo, colour-blocking, CTAs, interaction highlights |

**Accessibility decision:** real Flag Blue on the dark grays is **1.38:1** (needs 4.5:1), so it is invisible as text. The system keeps Flag Blue for what it does best (big flat blocks, and text on beige at 11.7:1) and uses `signal` for type on dark: **6.47:1 on void, 5.69:1 on slate-deep, 4.71:1 on slate**. Beige on void is 16.1:1. Re-check with `node tests/visual/contrast.cjs`.

### Type system

Two families, three voices:

| Utility | Font | Settings | Use |
|---|---|---|---|
| `font-poster` | Archivo Variable | `font-stretch:125%`, 900, `-0.035em`, uppercase | Poster headlines ONLY |
| `font-accent` | Archivo Variable | `font-stretch:75%`, italic 500, uppercase | The editorial "second voice" (the reference's *CRAFTING UNIQUE*) |
| `font-body` | Archivo Variable | 100% width, 400 | Everything a business owner must actually read |
| `font-label` | JetBrains Mono | 11px, `0.14em`, uppercase | HUD, indices, spec sheets |

Fluid scale (375px → 1920px):

```
--text-mega    clamp(4.5rem, 17vw, 20rem)   / 0.78   loader word, CTA "HAND IT OFF."
--text-poster  clamp(3.25rem, 10vw, 11.5rem)/ 0.82   section posters
--text-hero    clamp(3rem, 8.4vw, 10.5rem)  / 0.82   hero title (fits "BUSYWORK" at 1280)
--text-h1      clamp(2.5rem, 6vw, 6.5rem)   / 0.88
--text-h2      clamp(2rem, 4.2vw, 4.25rem)  / 0.92
--text-h3      clamp(1.25rem, 2vw, 2rem)    / 1.05
--text-lead    clamp(1.125rem, 1.45vw, 1.5rem) / 1.45  ← body copy floor is 18px
--text-label   0.6875rem / 1.2
```

### Layout rules (Marathon poster grammar)

1. **12-column `poster-grid`**, gutters `clamp(1rem,1.6vw,1.5rem)`, side padding `clamp(1rem,3.2vw,3rem)`.
2. **Every section opens with an index label**: `[03] ── THE PROTOCOL ─────── TYPICAL TIMELINE`.
3. **One poster word per screen.** Headlines are huge; body copy stays ≤ 44ch and ≥ 18px.
4. **Colour-block rhythm:** dark → Flag Blue block (Process) → dark → beige block (calculator result, CTA button, footer). Beige never appears as more than one block per viewport.
5. **Chamfered corners** (`chamfer` utility) on interactive surfaces; **hazard stripes** (`hazard`) mark section edges.
6. **The HUD frames everything:** corner brackets, `+` registration marks, live coordinates, scroll gauge, clock, roaming `[[00X]]` page counter.
7. **Readability guardrail:** decorative type may be outlined or dimmed; anything with a verb in it is solid, high-contrast `font-body`.

---

## 3. Motion design & the WebGL experience: the moon scene

The hero is a **dark slate-gray moon / exoplanet valley at night** (modelled on the Lusion "About" hero). A bright particle orb hangs dead centre and shines a beam of light onto the valley floor; the ground reacts as if a gust of wind blasts outward from the impact and the dust spreads apart; an ethereal cyclone spins under the orb. The orb and the cyclone are clickable and open info panels. Everything is procedural: nothing is downloaded.

| File | Responsibility |
|---|---|
| `components/canvas/Scene.tsx` | `<Canvas>`, camera rig (scroll + route + panel focus), moonlight, env, post pipeline, quality tier |
| `components/canvas/moon/MoonScene.tsx` | Composes the scene in a `world` group (route pose), hover springs, 3D click proxies, projects the DOM hotspots, DOF focus, `sceneReady` |
| `components/canvas/moon/moonShaders.ts` | Shared GLSL: **`terrainHeight(xz)`** (single source of truth for ground + dust), fbm, craters, beam, dust, cyclone, sky |
| `components/canvas/moon/Terrain.tsx` | 170×170 plane (384² / 192² segments) displaced on the GPU; `MeshStandardMaterial` patched via `onBeforeCompile` |
| `components/canvas/moon/Orb.tsx` | `<ParticleCore/>` + white-hot heart + faint haze + **PointLight** |
| `components/canvas/moon/LightBeam.tsx` | Beam cone, impact flare, upright glint, **SpotLight** down the beam |
| `components/canvas/moon/GroundDust.tsx` | GPGPU wind-blown dust (256² / 128²) |
| `components/canvas/moon/Cyclone.tsx` | Analytic vertex-shader vortex (40k / 15k) + 5 helical ribbons |
| `components/canvas/moon/Sky.tsx` | Night sky dome (zenith → horizon haze, a few faint stars) + drifting rock fragments |
| `components/canvas/ParticleCore.tsx` + `nebulaShaders.ts` | The orb's GPGPU curl-noise nebula |
| `lib/useGpgpu.ts` | Shared `GPUComputationRenderer` setup (position/velocity FBOs, spawn texture, disposal) used by the orb and the dust |
| `components/dom/Hotspots.tsx`, `InfoPanel.tsx`, `HintToast.tsx` | "This is clickable" cues + the panels |

### 3.1 Typography rule: tabular numerals

```css
html {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
}
```

Every digit has the same advance width, so the loader's `000→100`, the ROI figure, prices, `[[00X]]` and the HUD clock never jitter while animating.

### 3.2 Loader → reveal (the curtain)

1. The brand name *is* the progress bar (outline text, beige fill clipped by progress; tabular `000%`).
2. At 100% the word **rushes at the viewer** (`scale 1 → 5.5`, `expo.in`), as if reaching through the screen.
3. A seam flashes down the centre, two stepped glitch-jolts, then the two halves (each a clip-path'd copy of the whole loader) **part like a curtain**.
4. On the same frame (`open` label) **`motion.reveal` tweens 0 → 1** — and the website (`#page` + every `[data-chrome]`) fades in with the **same position, duration (2.2 s) and ease (`power2.inOut`)**. The scene reveal *is* the site fade. Verified by `tests/visual/intro2.cjs`: max |reveal − UI opacity| = 0.000.

What `reveal` drives: the orb ignites (nebula radius + intensity), the beam strikes down from the orb (`uStrike`, 0.12→0.42), hits the ground with a flash, a **shock ring** races out over the terrain while the dust gets a big gust, the cyclone **builds from the ground up**, and the camera settles back 3.2 units.

Reduced motion: no rush, no curtain; `reveal = 1` immediately and the GPGPU simulations settle for 90 frames, then hold still.

### 3.3 The ground: `terrainHeight(xz)`

- **Valley floor** around the impact: near-flat within r≈1.5, fbm undulation growing outward; pale albedo, scattered dark pebbles.
- **Side ridges**: rise on `|x|` along a meandering axis, ridged fbm (rugged, striated like the reference) plus a taller outer range.
- **Back wall** far down −z, **craters** (bowl + raised rim) on a jittered 7-unit grid, none near the beam.
- The mesh is displaced in the vertex shader; **normals are per-pixel finite differences** in the fragment shader (epsilon grows with distance → no shimmer), so lighting has detail the mesh can't carry.
- Emissive patch: **impact glow**, the reveal **shock ring**, and **radial wind streaks** scrolling outward from the beam.
- `GroundDust` calls the same function, so the dust hugs exactly the surface you see.

### 3.4 The orb (GPGPU nebula)

`ParticleCore` (512² = 262,144 particles high, 256² low). Velocity pass: two octaves of curl noise + containment spring with a stiff wall at `uRadius` (a round orb with wispy arms) + three orbiting attract/repel attractors (clumps form, stream, disperse) + central breathing. Additive points: a tiny per-particle intensity (calibrated × `262144 / count`) sums to a bright, textured heart. A small HDR billboard adds the white-hot centre. Cursor pushes and swirls particles; a click sends a shockwave. **Hover → brighter and more turbulent** (activity, radius +12%, light +50%).

### 3.5 Beam, dust, cyclone

- **Beam**: open cone orb → ground, view-dependent core (`|N·V|^2.2`), scrolling noise flow, travelling "head" while it strikes. Impact flare disc on the ground + a small upright glint. A **SpotLight** down the beam makes the real light pool on the regolith.
- **Ground dust** (GPGPU, 256² / 128²): radial outflow (`3/(1+0.22r)`), **gust waves** travelling outward, a swirl near the beam that feeds the cyclone, lift near the impact and settling farther out, curl-noise eddies. Particles are clamped to `terrainHeight`, respawn near the impact (55%) or across the valley (45%). Lit by the orb (inverse square) + the beam pool.
- **Cyclone**: every particle rides a helix that is a pure function of time — it rises over its own period while orbiting with `ω ∝ 1/r` (tight core spins fastest). `θ = θ0 + age·ω(r) + uPhase` keeps it smooth forever; hover integrates extra `uPhase` (spin-up). Funnel widens toward the orb, with a debris skirt at the ground. Flag Blue ↔ Beige, additive, bloomed. Five faint helical ribbons with travelling glints wrap it.

### 3.6 Lighting & render pipeline

- **No ambient light.** The orb's PointLight and the beam's SpotLight carry the scene; a faint cool directional **moonlight** from behind-left rims the ridges. A baked monochrome `Lightformer` env at **0.12** keeps shadow sides from going dead.
- **Sky**: dome following the camera; dark slate zenith → hazy horizon band (= fog colour, so ridges melt into the night); a few faint stars (no starfield-demo clichés).
- **Bloom is selective**: only the orb, beam, impact flare and cyclone are inside `<Select enabled>`.
- Pipeline: **DOF** (high tier; focus locked on the orb via `focusPoint`) → **cursor lens** (a whisper of dispersion, never rainbow) → **SelectiveBloom** (`ignoreBackground`) → **ACES Filmic** → grain → vignette.

### 3.7 Interaction + discoverability

- **Hotspots** (`components/dom/Hotspots.tsx`): two real `<button>`s pinned every frame to the orb and the cyclone (3D → screen projection in `MoonScene`): a sonar-pinging dot, a leader line and a label `◉ THE CORE · CLICK` / `◉ THE ENGINE · CLICK`. Keyboard-focusable, aria-labelled, touch-friendly; hover/focus also lights up the 3D object. They fade out as soon as the hero scrolls.
- **3D click proxies**: invisible sphere (orb) and cylinder (cyclone) raycast targets, so clicking the visuals works too. Hovering one turns the cursor ring into **"OPEN"**.
- **Hint toast**: after the intro, "Click (Tap) the orb or the storm to explore". It disappears after the first panel opens and remembers that in `localStorage` (wrapped in try/catch).
- **Info panel** (`InfoPanel.tsx`): Marathon sheet slicing in from the right (clip-path) with code, title, body, 3 bullets and a "Book an audit" CTA. Esc / ✕ / outside click closes; focus is trapped and restored; Lenis stops; the camera eases toward the clicked object (`motion.focus`) while the hero copy steps back. Copy lives in `lib/config.ts → INFO`.

### 3.8 Hero scroll (the reference's zoom-out)

`motion.hero` 0 → 1 over the 340vh sticky track: the camera dollies back (z 9.5 → 36) and up (y 1.7 → 11) with a slight FOV widen, until the orb + beam + storm are a small lit point in a vast moonscape; the scene dims and the statement copy reveals word by word. The CTA section (`motion.cta`) flies the camera back down to the orb.

### 3.9 Spring physics

`lib/spring.ts`: semi-implicit Euler, sub-stepped at 120 Hz, deliberately under-damped (overshoot + settle). Used for the cursor ring and the orb / storm hover response.

---

## 4. Homepage wireframe

Every block is a `[data-section]` and counts as a "page" for the `[[00X]]` counter.

| Page | Counter | Section | Poster move | Conversion job |
|---|---|---|---|---|
| 001 | top-left | **HERO** (340vh sticky track) | Moon valley at night: the orb dead centre beams onto the ground, wind-blown dust, a cyclone under the orb; **orb + storm are clickable** (pulsing hotspots, info panels). Headline bottom-left, body copy + CTA bottom-right, dot grid top-right, "+" marks around the frame. Scroll = camera dollies back and up until the scene is a lit point in a vast moonscape; statement reveals word by word. | Primary CTA "Book a 20-min audit" |
| 002 | bottom-left | **01 · The busywork tax** | "YOUR TEAM IS DOING A ROBOT'S JOB." Six repetitive tasks, each **struck through by a beige bar** as you scroll. Flag Blue rule-of-thumb card. | Recognition: "that's my week" |
| 003 | top-right | **02 · The units** | Pinned horizontal track. 5 chamfered spec cards (INPUT / ACTION / OUTPUT, barcode, ONLINE), with beige colour-block cards on beats 2 and 4. | Product understanding |
| 004 | bottom-right | **03 · The protocol** | Full-bleed **Flag Blue block** constructed by a centre-out mask. "FOUR STEPS. ZERO CHAOS." scales up. Hazard stripe. 01–04 numerals. | De-risking |
| 005 | top-centre | **04 · Price your busywork** | Sliders, then a beige result block with a mega dollar figure counting up. | High-intent self-qualification |
| 006 | upper-right | **05 · Field reports** | Dashed "case file" cards. **Placeholders: replace with real results before launch.** | Social proof |
| 007 | bottom-centre | **06 · Questions owners ask** | Big-type accordion. | Objection handling |
| 008 | upper-left | **07 · Hand it off** | Camera flies back down to the orb. "HAND IT OFF." in mega type over it. | Final CTA → /booking |
| 009 | top-left | **Footer** | Beige block, cropped mega wordmark, hazard stripe. | Contact |

Routes: `/pricing` (the moon scene slides left, plans on the right) and `/booking` (camera far and high; the orb is a dim beacon behind the form).

---

## 5. Architecture & synchronization

### 5.1 The frame bridge

```
 Lenis ──velocity──┐                         ┌── useFrame (MoonScene, CameraRig, Lens)
 ScrollTrigger ────┼──► lib/motion.ts ───────┤
 Pointer events ───┤   (mutable, no React)   └── DOM writers (HUD, hotspots, cursor)
 Router/GSAP ──────┘
```

One clock: `gsap.ticker` drives Lenis (`lenis.raf`), ScrollTrigger reads Lenis, and R3F's loop reads `motion.*`. Scroll *is* the timeline. Every camera value is a pure function of `motion.hero`, `motion.cta`, `motion.reveal`, `motion.focus` and `motion.stage`, then damped with `1 - exp(-dt·3.2)`, so it's frame-rate independent.

### 5.2 Seamless page routing (the Lusion transition method)

The site never hard-reloads, never flashes white, and never tears down WebGL. Moving between pages is camera movement through one continuous space.

#### a) The persistent canvas

`app/layout.tsx` renders `<Shell>{children}</Shell>`. In the App Router, a **root layout is never re-mounted on navigation**: only the `children` segment swaps. So everything in `Shell` lives for the whole session:

```tsx
// components/Shell.tsx (mounted once)
<SmoothScroll />  <WarpFilter />
<CanvasRoot />                 // R3F <Canvas>: context, geometry, compiled shaders persist
<Cursor />  <Hotspots />  <HintToast />
<TransitionProvider chrome={<><Hud /><PageCounter /></>}>
  <Reveals />
  {children}                   // ← the ONLY thing that changes per route
  <Footer />
</TransitionProvider>
<InfoPanel />
<Preloader />                  // plays once, then display:none forever
```

- The `<Canvas>` is `position: fixed`, `z-0`, with `eventSource={document.body}` so the DOM above never blocks 3D hover.
- `CanvasRoot` uses `next/dynamic(..., { ssr: false })`, which keeps three.js out of the server bundle.
- **Verified:** after Home → Pricing → Booking → Back → Home, the same `<canvas>` element is still in the DOM with zero `webglcontextlost` events.

#### b) Route-driven 3D choreography

`lib/routes.ts` maps each route to a **stage**: camera position, FOV, look target, and the moon scene's position, rotation, scale, dim and activity.

```ts
"/pricing": { camZ: 12.5, subjectX: -3.6, subjectRot: 0.35, dim: .8, … }, // scene slides left
"/booking": { camY: 7.5, camZ: 30, subjectX: 4.5, dim: .5, … },            // far and high, a dim beacon
```

On navigation, GSAP tweens `motion.stage` to the new pose (`expo.inOut`, 1.8s) and tweens `motion.homeWeight` (1 on home, 0 elsewhere). `CameraRig` blends **home scroll choreography ↔ route pose** by `homeWeight`, so even leaving the homepage mid-scroll glides continuously.

The whole scene sits in one `world` group that owns the route pose; the camera owns the scroll, intro settle and panel focus, so route moves, the intro and interaction never fight.

#### c) DOM masking: slice shut, slice open

`components/transition/TransitionProvider.tsx` + `TransitionLink.tsx` (a drop-in `<Link>`).

```
t=0.00  click ─┬─ choreograph(target): camera + scene start moving THIS frame
               └─ #page clip-path → inset(50% 0 50% 0)   (0.7s expo.in: page slices shut)
t=0.30         beige seam scales across the centre + "ROUTING ▸ /PRICING" + stepped glitch
t=0.70         router.push(target)   (already prefetched: no network wait)
t≈0.75  pathname commits → scroll reset under the seam
               #page clip-path → inset(0)   (1.1s expo.out: slices open)
               [data-enter] lines rise out of SplitText masks, staggered 0.07s
t≈1.85         lines land as the camera tween settles
```

- Masking uses **clip-path only, never transforms** on `#page`, because transforms would break ScrollTrigger pins and `position: fixed` children.
- Back/forward (popstate) skips the outro but still gets the choreography and entrance.
- Hash links (`/#agents`) navigate first, then Lenis scrolls to the anchor once the entrance completes.
- A direct load of `/pricing` gets the blast-door loader, then the same `[data-enter]` entrance.

#### d) Pre-loading

1. `TransitionLink` keeps Next's **viewport prefetch** (`prefetch` prop) and adds **hover/focus prefetch** (`router.prefetch`).
2. Once the loader finishes, `requestIdleCallback` prefetches every "next logical" route (`PREFETCH_ROUTES`) **and** `import()`s the `BookingForm` chunk, so the booking JS is in cache before anyone clicks.
3. Nothing else needs fetching: geometry is procedural, fonts are self-hosted, and the environment map is baked from `Lightformer`s.
4. Because WebGL starts moving on the click frame (not after the fetch), even a cold navigation *feels* instant. The camera is already flying while the DOM swaps under the seam.

### 5.3 Page counter `[[00X]]`

`components/dom/PageCounter.tsx`. Every `[data-section]` inside `#page` is a page. An `IntersectionObserver` on the viewport's centre line detects the active page. On change the counter:

1. slices shut (`clip-path`),
2. **teleports to a new position**: page 1 top-left, page 2 bottom-left, then top-right, bottom-right, top-centre, upper-right, bottom-centre, upper-left (consecutive pages never share a spot),
3. slices open while its digits scramble and lock in left-to-right.

It sits on a small chamfered void plate so it stays legible over any content, and it restarts at `[[001]]` on each route.

---

## 6. Interaction catalogue

| Interaction | Where | How |
|---|---|---|
| Spring cursor ring | global | Under-damped spring; stretches + rotates along velocity |
| Magnetic buttons | `[data-magnetic]` | Ring morphs to element bounds; element pulled 22% toward pointer; elastic release |
| WebGL lens | canvas | Bulge + speed-scaled RGB split + light falloff around pointer |
| DOM light | global | Beige radial gradient at `--mx/--my`, `mix-blend-screen` |
| Type warp | `[data-warp]` | SVG turbulence + displacement; scale tracks pointer speed |
| Line reveals | `[data-split]` / `[data-enter]` | SplitText `mask:"lines"`, `yPercent:115`, expo.out |
| Construct masks | `[data-mask="up|left|center"]` | Scrubbed clip-path expansion |
| Poster scaling | `[data-scale]` | Scrubbed `scale .62→1` + letter-spacing tracking in |
| Strike-through | `[data-strike]` | Scrubbed beige bar `scaleX 0→1`, text fades to slate |
| Orb / storm hover | canvas + hotspots | Raycast proxy or hotspot button → object brightens / spins up, cursor ring reads "OPEN" |
| Orb / storm click | canvas + hotspots | Opens the info panel; camera eases toward the object; Esc / ✕ / outside click closes |

## 7. Accessibility & fallbacks

- `prefers-reduced-motion`: Lenis lerp 1, no loader zoom or glitch, static scene reveal (simulations settle, then hold still), no warp, no pinned horizontal track, no scrubbed reveals, no hotspot pings.
- Hotspots are real `<button>`s (Tab-reachable, `aria-haspopup="dialog"`); the info panel is `role="dialog"` + `aria-modal` with a focus trap and focus restore.
- Touch devices: native cursor, no warp, no magnet. Agents section stacks vertically under 768px.
- All copy is real DOM text (SEO + screen readers). The canvas is decorative; everything clickable in it has a DOM button twin.
- The loader has `role="status"` and a 9s failsafe.

## 8. Before launch (TODO)

- [ ] Real agency name (`BRAND` in `lib/config.ts`)
- [ ] Real pricing (`PLANS`, currently `$—`)
- [ ] Real case studies (`FieldReports.tsx` placeholders)
- [ ] Booking form endpoint (Cal.com / Formspree / Cloudflare Worker)
- [ ] OG image, favicon, analytics
- [ ] Real-device QA (iPhone Safari, mid-range Android)
