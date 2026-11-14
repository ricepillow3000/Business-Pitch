# AXON — Frontend Blueprint

B2B AI-automation agency for local businesses.
Marathon-poster art direction × Lusion-grade WebGL motion.
Everything in this document is implemented in this repo: each section points at the real file.

> Brand name is a placeholder. Change `BRAND.name` in `lib/config.ts` and the loader, HUD, footer and metadata all follow.

---

## 1. Tech stack & architecture

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router)**, `output: "export"` | Static HTML/JS, deployable to any CDN. Route-level code splitting + prefetch for free. |
| UI runtime | **React 19** | Required by R3F v9. |
| 3D | **three r180 + @react-three/fiber 9 + @react-three/drei 10** | Declarative scene graph, `useFrame` loop, `MeshTransmissionMaterial`, `Lightformer`, `PerformanceMonitor`. |
| Post FX | **@react-three/postprocessing 3 / postprocessing 6** | One merged `EffectPass`: custom Lens + Bloom + Noise + Vignette. |
| Shaders | Custom GLSL as TS template strings (`components/canvas/shaders.ts`) | No bundler loader config; shaders tree-shake with their component. |
| Timeline / scroll | **GSAP 3.15** (ScrollTrigger, SplitText, `@gsap/react`) | SplitText is now free; `mask: "lines"` gives the poster line-reveals. |
| Smooth scroll | **Lenis 1.3** driven by `gsap.ticker` | One RAF for Lenis + GSAP + ScrollTrigger. No double loops, no jitter. |
| State | **zustand** (low-frequency: loader phase) + **a plain mutable object** (`lib/motion.ts`, per-frame) | React never re-renders at 60fps. The DOM writes `motion.*` and WebGL reads it in `useFrame`. |
| Styling | **Tailwind v4** `@theme` tokens (`app/globals.css`) | Design tokens are the CSS variables; utilities are generated from them. |
| Fonts | Self-hosted via `@fontsource-variable` (Archivo w/ width axis, JetBrains Mono) | No FOUT on the loader, no third-party font requests. |

**Why GSAP, not Framer Motion, for page transitions:** App Router `AnimatePresence` exit animations rely on freezing the router context (`LayoutRouterContext` internals), which breaks between Next versions. The intercepted-link + GSAP timeline approach (section 6) is version-proof and shares one clock with the WebGL choreography.

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
  canvas/               ← Scene, Brain, geometry, shaders, LensEffect (WebGL only)
  dom/                  ← Preloader, Cursor, Hud, PageCounter, Reveals, WarpFilter, SmoothScroll, HubLabels
  transition/           ← TransitionProvider (route choreography) + TransitionLink
  sections/             ← poster sections (Hero, Busywork, Agents, Process, Calculator, …)
  booking/BookingForm   ← split chunk, pre-warmed on idle
lib/
  motion.ts             ← per-frame bridge DOM ⇄ WebGL
  routes.ts             ← route → camera/brain pose table
  config.ts             ← brand + all copy
  spring.ts             ← under-damped spring integrator
```

### Performance budget

- `dpr` 1.5 desktop / 1 mobile; `PerformanceMonitor.onDecline` drops to dpr 1 + cheap glass.
- Mobile (≤768px) or `?q=low` uses `meshPhysicalMaterial` transmission instead of `MeshTransmissionMaterial` (one extra render pass instead of six samples).
- All geometry is procedural (no GLB download). The brain and pathways are generated once in a `useMemo` (~40 ms).
- Additive particle / pathway materials use `depthWrite: false`. One draw call each.
- No React state in the frame loop. Labels, HUD numbers and cursor are written straight to DOM nodes.

---

## 2. Art direction & typography

### Palette (all tokens in `app/globals.css`)

| Token | Hex | Role |
|---|---|---|
| `void` | `#152626` | Page background: Dark Slate Gray pushed to near-black |
| `slate` | `#2F4F4F` | True Dark Slate Gray: the radial glow behind the brain, rules, struck-through text |
| `slate-deep` | `#1D3434` | Raised cards |
| `flag` | `#0A3161` | **Flag Blue**: colour-blocks (Process section), plan chips, text *on beige* |
| `signal` | `#6E9BF0` | Flag Blue's hue lifted for legibility: headers, HUD, data-viz on dark |
| `beige` | `#F5F5DC` | Logo, colour-blocking, CTAs, interaction highlights |

**Accessibility decision:** real Flag Blue on Dark Slate Gray is **1.45:1** (needs 4.5:1), so it is invisible as text. The system keeps Flag Blue for what it does best (big flat blocks, and text on beige at 11.7:1) and introduces `signal` for type on dark (5.7:1 on void). Beige on void is 14.2:1.

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

## 3. Animation logic: the loader

File: `components/dom/Preloader.tsx`

**Structure.** The loader is rendered **twice**, as two full-screen copies clipped to the left and right halves (`clip-path: inset(0 50% 0 0)` / `inset(0 0 0 50%)`). Because each half is a complete copy, any transform applied to "the word" happens identically in both. When the halves slide apart, the word splits exactly down the middle with no extra DOM work.

**The progress bar is the brand name.** Outline text (`text-outline`) sits under a beige fill copy whose `clip-path: inset(0 ${100-p}% 0 0)` is driven by progress.

**Progress is honest.** It eases to 86% over 2.4s (minimum brand moment), then waits for three flags: `document.fonts.ready`, WebGL `sceneReady` (set after the 3rd rendered frame, so shaders are compiled), and the minimum time. A 9s failsafe never traps the user.

```ts
const tl = gsap.timeline({ onComplete: () => setPhase("ready") });
tl.to(".loader-hud",  { autoAlpha: 0, duration: 0.35 })
  // heavy approach: expo.in = almost still for a second, then rushes the lens
  .to(".loader-word", { scale: 7.5, duration: 2.5, ease: "expo.in" }, 0.1)
  .addLabel("split", "-=0.5")
  .fromTo(".loader-seam", { scaleY: 0, autoAlpha: 1 }, { scaleY: 1, duration: 0.2, ease: "power4.out" }, "split")
  // glitch-shift: two hard stepped jolts
  .to(".loader-l", { x: -22, duration: 0.05, ease: "steps(1)" }, "split+=0.2")
  .to(".loader-r", { x: 26, y: 6, duration: 0.05, ease: "steps(1)" }, "<")
  .to(".loader-l", { x: 8, y: -4, duration: 0.05, ease: "steps(1)" })
  .to(".loader-r", { x: -10, y: 0, duration: 0.05, ease: "steps(1)" }, "<")
  .add(startIntro) // WebGL camera begins drifting out of the glass NOW
  .to(".loader-l", { xPercent: -102, duration: 1.2, ease: "expo.inOut" })
  .to(".loader-r", { xPercent: 102,  duration: 1.2, ease: "expo.inOut" }, "<");
```

`startIntro` tweens `motion.intro` 0→1. The camera starts *inside* the brain (`z -= (1-intro)*1.9`) so the doors open onto a close-up that pulls back.

Reduced motion: no scale, no glitch, 0.4s fade.

---

## 4. 3D brain: WebGL specification

Files: `components/canvas/brainGeometry.ts`, `Brain.tsx`, `shaders.ts`, `Scene.tsx`, `LensEffect.tsx`

### 4.1 Geometry (procedural, deterministic)

- **Cerebrum:** a welded `SphereGeometry(1, 200, 150)` with its seams merged so normals are smooth.
  - Domain-warped simplex noise: `n(p + 0.35·n(p·1.7))`.
  - **Sulci** are carved where `|noise| → 0` with `smoothstep(0, .22, |n|)`. That gives thin grooves with plateaus (gyri) between them, which reads as a brain and not a blob.
  - A Gaussian **longitudinal fissure** at `x≈0` on the top half.
  - Ellipsoid scale `(0.74, 0.66, 1)`, a flattened underside, a taller frontal lobe and a temporal bulge.
- **Cerebellum:** a squashed sphere with `|sin(y·26)|` ridges and a midline notch.
- **Stem:** a tapered open cylinder.
- Merged into **one geometry → one draw call** for the glass.
- Seeded RNG (`mulberry32`) gives an identical brain on every load.

### 4.2 Glass material

```tsx
<MeshTransmissionMaterial
  samples={6} resolution={768} transmission={1} thickness={0.55}
  roughness={0.12} ior={1.32} chromaticAberration={0.08} anisotropicBlur={0.15}
  distortion={0.35} distortionScale={0.4} temporalDistortion={0.08}
  clearcoat={1} color="#e9ecd8" attenuationColor="#6e9bf0" attenuationDistance={2.4}
  background={new Color("#152626")} />
```

- **Reflections without an HDR download:** `<Environment frames={1}>` bakes four `Lightformer` softboxes once (beige top strip, blue side strips, blue ring). Every highlight on the glass is on-palette.
- **Holographic shell:** the same geometry at `scale 1.004` with an additive `ShaderMaterial`. It adds a fresnel rim (`pow(1-|N·V|, 2.6)`, blue → beige at grazing angles), 34 thin scanlines per unit drifting in Y, a slow bright sweep band, and a hover hotspot. This keeps the brain from reading as a medical model: it's an artifact.
- **Low tier:** `meshPhysicalMaterial` transmission (one pass instead of six).

### 4.3 Data pathways: the agent workflow

1. Sample **640 nodes** on the cerebrum (`MeshSurfaceSampler`) and push them inward ×0.8–0.9, so they live *inside* the glass and get refracted.
2. **5 hubs** chosen by farthest-point sampling. These are the 5 agent units (Receptionist, Scheduler, Collector, Reputation, Data Clerk).
3. From each hub, **15 random walks** of 6–13 hops through the 8 nearest neighbours, biased away from the hub. The result is organic branching "workflows".
4. Each walk becomes a centripetal `CatmullRomCurve3`, then a thin `TubeGeometry(r=0.0045, radial=3)`. Each tube carries per-vertex attributes `aProgress` (0→1 along the path), `aSeed`, and `aHub`. All tubes merge into one geometry.
5. Fragment shader:

```glsl
float head  = fract(uTime * speed * (0.7 + uActivity) + vSeed * 13.1); // task in flight
float d     = head - vProgress;
float trail = smoothstep(0.28, 0.0, d) * step(0.0, d);                  // fading tail
float tip   = smoothstep(0.025, 0.0, abs(d));                            // beige spark
float hover = uHoverAmt * smoothstep(0.55, 0.0, distance(vLocal, uHover));
vec3  tint  = mix(uBlue, uBeige, step(0.62, vSeed));                     // 62% blue / 38% beige
gl_FragColor = vec4(tint * (base + trail*(0.55+uActivity*0.6) + hover*1.4) + uBeige*tip*(1.2+uActivity), 1.);
```

Two pulses per path, half a cycle apart, read as a queue of tasks. **`uActivity`** = idle 0.35 + scroll velocity + pointer hover + magnetic-button hover + CTA proximity, so the brain visibly "works harder" when the user engages. `uFocusHub` can isolate one agent's workflow.

6. **Synapse nodes:** additive `Points` with per-node `pow(sin, 14)` flashes. Hubs are 4.5× larger and always beige.
7. **Hub callouts** (`HubLabels.tsx`) are plain DOM. `Brain.tsx` projects each hub to screen space every frame and writes `transform` directly. Cheaper and more stable than drei `<Html>`.

### 4.4 Spring physics

`lib/spring.ts` is a semi-implicit Euler spring with 120Hz sub-stepping, deliberately **under-damped** so it overshoots and settles. A lerp never overshoots, which is why lerped scenes feel weightless.

- `ry/rx` follow the pointer (k 70, c 9) plus a slow idle drift.
- Scroll velocity is injected as an **impulse**: `springs.ry.impulse(vel * 0.0009)`. Flick the wheel and the brain gets knocked, then settles.
- Volume-preserving **squash** on velocity: `scale(1/√s, s, 1/√s)`.

### 4.5 Nebula → beam (the reference's zoom-out)

4,200 particles. Each carries a cloud position **and** a beam position (`aBeam`). The vertex shader mixes them with a per-particle staggered `uCollapse`. As the hero scrolls, the nebula pours into a vertical shaft through the brain while the camera dollies back. A soft open cone adds the light shaft. All of this is driven by `motion.hero`.

### 4.6 Post-processing and cursor lens

A custom `postprocessing` `Effect` (`LensEffect.tsx`, `EffectAttribute.CONVOLUTION`, first in the chain) does four things:

- A barrel **bulge** around the cursor.
- **RGB split** scaled by pointer speed, which is the fluid feel.
- A soft beige **light falloff**, so the cursor is a light source.
- **`uDim`**, the global scene-brightness control used by the scroll and route choreography.

Then Bloom (mipmap, threshold 0.55), additive film Noise, and Vignette.

---

## 5. Homepage wireframe

Every block is a `[data-section]` and counts as a "page" for the `[[00X]]` counter.

| Page | Counter | Section | Poster move | Conversion job |
|---|---|---|---|---|
| 001 | top-left | **HERO** (340vh sticky track) | Close-up glass brain. "WE BUILD AGENTS THAT DO THE BUSYWORK" (signal + beige). Scroll = camera dolly-out, nebula collapses to beam, scene dims, statement reveals word by word. | Primary CTA "Book a 20-min audit" |
| 002 | bottom-left | **01 · The busywork tax** | "YOUR TEAM IS DOING A ROBOT'S JOB." Six repetitive tasks, each **struck through by a beige bar** as you scroll. Flag Blue rule-of-thumb card. | Recognition: "that's my week" |
| 003 | top-right | **02 · The units** | Pinned horizontal track. 5 chamfered spec cards (INPUT / ACTION / OUTPUT, barcode, ONLINE), with beige colour-block cards on beats 2 and 4. | Product understanding |
| 004 | bottom-right | **03 · The protocol** | Full-bleed **Flag Blue block** constructed by a centre-out mask. "FOUR STEPS. ZERO CHAOS." scales up. Hazard stripe. 01–04 numerals. | De-risking |
| 005 | top-centre | **04 · Price your busywork** | Sliders, then a beige result block with a mega dollar figure counting up. | High-intent self-qualification |
| 006 | upper-right | **05 · Field reports** | Dashed "case file" cards. **Placeholders: replace with real results before launch.** | Social proof |
| 007 | bottom-centre | **06 · Questions owners ask** | Big-type accordion. | Objection handling |
| 008 | upper-left | **07 · Hand it off** | Camera flies back to the brain. "HAND IT OFF." in mega type over it. | Final CTA → /booking |
| 009 | top-left | **Footer** | Beige block, cropped mega wordmark, hazard stripe. | Contact |

Routes: `/pricing` (brain left in profile, 5 hubs lit, plans on the right) and `/booking` (brain retreats far up-right and dims, form gets the stage).

---

## 6. Architecture & synchronization

### 6.1 The frame bridge

```
 Lenis ──velocity──┐                         ┌── useFrame (Brain, CameraRig, Lens)
 ScrollTrigger ────┼──► lib/motion.ts ───────┤
 Pointer events ───┤   (mutable, no React)   └── DOM writers (HUD, labels, cursor)
 Router/GSAP ──────┘
```

One clock: `gsap.ticker` drives Lenis (`lenis.raf`), ScrollTrigger reads Lenis, and R3F's loop reads `motion.*`. Scroll *is* the timeline. Every camera value is a pure function of `motion.hero`, `motion.cta`, `motion.intro` and `motion.stage`, then damped with `1 - exp(-dt·3.2)`, so it's frame-rate independent.

### 6.2 Seamless page routing (the Lusion transition method)

The site never hard-reloads, never flashes white, and never tears down WebGL. Moving between pages is camera movement through one continuous space.

#### a) The persistent canvas

`app/layout.tsx` renders `<Shell>{children}</Shell>`. In the App Router, a **root layout is never re-mounted on navigation**: only the `children` segment swaps. So everything in `Shell` lives for the whole session:

```tsx
// components/Shell.tsx (mounted once)
<SmoothScroll />  <WarpFilter />
<CanvasRoot />                 // R3F <Canvas>: context, geometry, compiled shaders persist
<Cursor />  <HubLabels />
<TransitionProvider chrome={<><Hud /><PageCounter /></>}>
  <Reveals />
  {children}                   // ← the ONLY thing that changes per route
  <Footer />
</TransitionProvider>
<Preloader />                  // plays once, then display:none forever
```

- The `<Canvas>` is `position: fixed`, `z-0`, with `eventSource={document.body}` so the DOM above never blocks 3D hover.
- `CanvasRoot` uses `next/dynamic(..., { ssr: false })`, which keeps three.js out of the server bundle.
- **Verified:** after Home → Pricing → Booking → Back → Home, the same `<canvas>` element is still in the DOM with zero `webglcontextlost` events.

#### b) Route-driven 3D choreography

`lib/routes.ts` maps each route to a **stage**: camera position, FOV, look target, and the brain's position, rotation, scale, dim, label visibility and activity.

```ts
"/pricing": { camZ: 6.2, brainX: -2.25, brainRot: -0.9, labels: 1, dim: .85, … }, // brain swings left, hubs light up
"/booking": { camZ: 12,  brainX: 3.6, brainY: 2.2, dim: .5, … },                  // retreats up-right, dims
```

On navigation, GSAP tweens `motion.stage` to the new pose (`expo.inOut`, 1.8s) and tweens `motion.homeWeight` (1 on home, 0 elsewhere). `CameraRig` blends **home scroll choreography ↔ route pose** by `homeWeight`, so even leaving the homepage mid-scroll glides continuously.

The brain sits in two nested groups: an outer **stage group** (route pose, tweened) and an inner **physics group** (springs). Route moves and pointer physics never fight.

#### c) DOM masking: slice shut, slice open

`components/transition/TransitionProvider.tsx` + `TransitionLink.tsx` (a drop-in `<Link>`).

```
t=0.00  click ─┬─ choreograph(target): camera + brain start moving THIS frame
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

### 6.3 Page counter `[[00X]]`

`components/dom/PageCounter.tsx`. Every `[data-section]` inside `#page` is a page. An `IntersectionObserver` on the viewport's centre line detects the active page. On change the counter:

1. slices shut (`clip-path`),
2. **teleports to a new position**: page 1 top-left, page 2 bottom-left, then top-right, bottom-right, top-centre, upper-right, bottom-centre, upper-left (consecutive pages never share a spot),
3. slices open while its digits scramble and lock in left-to-right.

It sits on a small chamfered void plate so it stays legible over any content, and it restarts at `[[001]]` on each route.

---

## 7. Interaction catalogue

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
| Brain hover | canvas | Raycast point → pathway + shell hotspot, activity spike |

## 8. Accessibility & fallbacks

- `prefers-reduced-motion`: Lenis lerp 1, no loader zoom or glitch, no warp, no pinned horizontal track, no scrubbed reveals.
- Touch devices: native cursor, no warp, no magnet. Agents section stacks vertically under 768px.
- All copy is real DOM text (SEO + screen readers). The canvas is decorative.
- The loader has `role="status"` and a 9s failsafe.

## 9. Before launch (TODO)

- [ ] Real agency name (`BRAND` in `lib/config.ts`)
- [ ] Real pricing (`PLANS`, currently `$—`)
- [ ] Real case studies (`FieldReports.tsx` placeholders)
- [ ] Booking form endpoint (Cal.com / Formspree / Cloudflare Worker)
- [ ] OG image, favicon, analytics
- [ ] Real-device QA (iPhone Safari, mid-range Android)
