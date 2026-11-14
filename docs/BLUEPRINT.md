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
| 3 | Loader animation logic | §3.2, §3.7 |
| 4 | WebGL spec: `<HeroMannequin/>`, AI core, materials, lighting, pipeline | §3.3–3.6 |
| 5 | Homepage wireframe | §4 |
| 6 | Seamless routing, persistent canvas, page counter | §5 |
| 7 | GSAP + R3F sync of Z approach, split and DOM fade | §3.7 |

---

## 1. Tech stack & architecture

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router)**, `output: "export"` | Static HTML/JS, deployable to any CDN. Route-level code splitting + prefetch for free. |
| UI runtime | **React 19** | Required by R3F v9. |
| 3D | **three r180 + @react-three/fiber 9 + @react-three/drei 10** | Declarative scene graph, `useFrame` loop, `useGLTF`, `Lightformer` studio HDRI, `PerformanceMonitor`. |
| Post FX | **@react-three/postprocessing 3 / postprocessing 6** | DOF → custom Lens → SelectiveBloom → ACES ToneMapping → Noise → Vignette (auto-split into passes where convolutions conflict). |
| Shaders | Custom GLSL as TS template strings (`components/canvas/shaders.ts`) | No bundler loader config; shaders tree-shake with their component. |
| Timeline / scroll | **GSAP 3.15** (ScrollTrigger, SplitText, `@gsap/react`) | SplitText is now free; `mask: "lines"` gives the poster line-reveals. |
| Smooth scroll | **Lenis 1.3** driven by `gsap.ticker` | One RAF for Lenis + GSAP + ScrollTrigger. No double loops, no jitter. |
| State | **zustand** (low-frequency: loader phase) + **a plain mutable object** (`lib/motion.ts`, per-frame) | React never re-renders at 60fps. The DOM writes `motion.*` and WebGL reads it in `useFrame`. |
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
  canvas/               ← Scene, HeroRig, HeroMannequin, AICore, geometry, shaders, LensEffect (WebGL only)
  dom/                  ← Preloader, Cursor, Hud, PageCounter, Reveals, WarpFilter, SmoothScroll, HubLabels
  transition/           ← TransitionProvider (route choreography) + TransitionLink
  sections/             ← poster sections (Hero, Busywork, Agents, Process, Calculator, …)
  booking/BookingForm   ← split chunk, pre-warmed on idle
lib/
  motion.ts             ← per-frame bridge DOM ⇄ WebGL
  routes.ts             ← route → camera / bust pose table
  config.ts             ← brand + all copy
  spring.ts             ← under-damped spring integrator
  intro.ts              ← intro sync constants
public/models/
  mannequin.glb         ← "Bust" + "Dome" nodes (npm run build:model)
scripts/
  build-mannequin.ts    ← procedural sculpt → GLB
```

### Performance budget

- `dpr` 1.5 desktop / 1 mobile; `PerformanceMonitor.onDecline` drops to dpr 1, no DOF, no MSAA.
- One 1.8 MB GLB (1.1 MB gzipped), loaded behind the loader. The loader's 100% genuinely waits for it.
- Strings, vias and the ball are 3 draw calls in total; exit traces are 1.
- Optional: meshopt-compress the GLB with `gltfpack` for roughly 3–4× smaller. The decoder ships with three.js. The tool wasn't run here because it needs your OK to download and run.
- No React state in the frame loop. Labels, HUD numbers and cursor are written straight to DOM nodes.

---

## 2. Art direction & typography

### Palette (all tokens in `app/globals.css`)

| Token | Hex | Role |
|---|---|---|
| `void` | `#152626` | Page background: Dark Slate Gray pushed to near-black |
| `slate` | `#2F4F4F` | True Dark Slate Gray: the radial glow behind the bust, rules, struck-through text |
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

## 3. Motion design & the WebGL experience

The hero is a **featureless white porcelain bust** in 3/4 profile. It reaches out of the void as the curtain opens. Its skull splits horizontally just above the nose, and the dome lifts to reveal the **AI core**: a contained ball of light wrapped in circuit-routed strings of light. The narrative: the human "shell" (repetitive manual labour) opens to show the automation inside.

| File | Role |
|---|---|
| `components/canvas/HeroMannequin.tsx` | `<HeroMannequin/>`: GLTF nodes, porcelain material, dome lift, core lights |
| `components/canvas/AICore.tsx` | `<AICore/>` (ball of light + strings + vias) and `<ExitTraces/>` |
| `components/canvas/HeroRig.tsx` | Group hierarchy: route pose → Z approach → profile/head-turn |
| `components/canvas/mannequinGeometry.ts` | Procedural sculpt; source of the GLB |
| `components/canvas/coreGeometry.ts` | Octilinear circuit-trace generator |
| `components/canvas/shaders.ts` | Volumetric core shader, string material patch, backdrop, nebula/beam |
| `components/canvas/Scene.tsx` | Studio lighting + render pipeline |
| `components/dom/Preloader.tsx` | **Master intro timeline** (the sync) |
| `lib/intro.ts` | Intro timing constants shared by all of the above |
| `scripts/build-mannequin.ts` | Writes `public/models/mannequin.glb` |

### 3.1 Typography rule: tabular numerals

Every digit on the site uses tabular lining figures, so animated numbers never jitter and columns align on a grid:

```css
/* app/globals.css */
html {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
}
```

`tabular-nums` is also set explicitly on the loader counter, ROI figures, prices, `[[00X]]`, process numerals, card indices and HUD coordinates/clock. **Verified in browser:** "111", "000" and "888" measure exactly the same width in both Archivo (poster) and JetBrains Mono.

### 3.2 Pre-loader → spatial transition

1. The brand name *is* the progress bar: an outline word with a beige fill clipped by progress, plus a tabular `000→100%` counter.
2. At 100%, the word takes a heavy `expo.in` push toward the lens (1.0s).
3. A seam flashes and two stepped glitch jolts follow. Then the **curtain** (two clip-path halves of the loader) parts.
4. **On the same frame** the bust starts its Z approach from `z = −38` in the fogged void, leaning in as if reaching through the screen.

### 3.3 The hero animation: the head split

- The cut is **horizontal, across the cranium, just above the nose** (`CUT = 0.26` head units).
- The skull is a closed porcelain solid: outer wall, inner wall (~3–4.5 cm) and a flat lip on the cut. You see real thickness when it opens.
- The separated **Dome** node lifts **straight up the Y axis** (0.95 units), drifting slightly back with a 0.12 rad tilt.
- A hairline of light leaks along the cut just before it opens (`motion.crack`).
- The head is fully open at exactly the moment the website is fully visible (see 3.7).

### 3.4 The AI core (the payload)

**Not an anatomical brain. Not chaotic fibres.**

**Ball of light:** a raymarched volume on a bounding sphere (`volumeFrag`). Each pixel marches 28 steps through a Gaussian density modulated by animated fbm. Emission runs from beige-hot at the centre to a Flag Blue edge. It's soft and contained, with an HDR centre around 1.7× beige, so it reads as an energy source, not a laser.

**Strings of light:** meticulously organised circuit traces (`createTraces`):
- 6 sagittal layers, none at x = 0, which leaves the longitudinal fissure, so two hemispheres read in pure line-work.
- Each layer has the brain contour plus inner gyri arcs, snapped to a 2.8 cm grid and routed **octilinearly (0°/45°/90° only)**, like PCB traces.
- Spokes route power from the ball out to the contour, and lateral buses bridge the hemispheres.
- Solder-pad vias sit at the trace ends. 5 of them are the agent hubs that carry the DOM labels on `/pricing`.

**Exit traces:** long octilinear runs leave the head and cross the page in screen space, ready to continue as DOM/SVG circuitry in later sections. They draw on as the dome lifts, then snake further out as the hero scrolls.

Strings use **`THREE.LineBasicMaterial`**, patched with `onBeforeCompile` (`patchStringMaterial`):

```ts
const m = new THREE.LineBasicMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  toneMapped: false, // author in HDR; ACES runs later in the composer
});
// + aProgress (arc-length 0→1) / aSeed attributes:
//   drawn  = 1 - smoothstep(uReveal - .015, uReveal, vProgress)   → strings grow out of the core
//   pulse  = travelling data packets, speed × uActivity             → the agents "working"
//   spark  = white-hot tip on the growing edge
```

**Colours (linear HDR, before tone mapping):** Flag Blue × 10 and Beige × 0.9 for string bodies (luminance ≈ 0.3–0.6, so a thin halo); pulses and the ball centre exceed 1.0. ACES then rolls those off to white-hot cores with coloured fringes, which is how real neon and fibre-optics photograph.

### 3.5 Material & shader specs: unglazed porcelain

```ts
new THREE.MeshPhysicalMaterial({
  color: "#f3f2ee",          // neutral porcelain white (no pink)
  roughness: 0.58,           // bisque-matte: broad, soft highlights
  metalness: 0,
  ior: 1.5,                  // dielectric → physically correct Fresnel at grazing angles
  specularIntensity: 0.55,
  clearcoat: 0.06,           // the faintest satin film; never glossy
  clearcoatRoughness: 0.45,
  sheen: 0.3, sheenRoughness: 0.85, sheenColor: "#ffffff", // unglazed micro-fuzz catching the rim
  envMapIntensity: 0.9,
  side: THREE.FrontSide,     // closed solid: no back-face tricks
});
```

**Subsurface scattering:** three.js has no built-in SSS, so the shell uses a fast Barré-Brisebois translucency term in `onBeforeCompile`. Core light is transmitted *through* the thin wall toward the eye:

```glsl
vec3 Ht = normalize(Lc + Nw * 0.45);                     // Lc: direction to the core
float trans = pow(clamp(dot(V, -Ht), 0., 1.), 2.5);
totalEmissiveRadiance += uCoreColor * trans * falloff * uSSS; // uSSS 0.12 → 0.62
```

The head glows faintly from within while it approaches. The interior is lit by **real light**: two point lights at the core (beige 6, blue 4, decay 2) that bounce off the matte white inner wall and the dome's underside.

**Geometry quality:**
- 192 segments around, about 70 rows per unit of height, spline-smoothed shoulder profile.
- Seamless normals: the θ = 0/2π seam down the nose is averaged, and the crown and chin poles get exact axial normals. Zero faceting.

**GLTF nodes:** `public/models/mannequin.glb` (1.8 MB, 1.1 MB gzipped) has two nodes:
- `Bust`: face below the cut, neck and shoulders.
- `Dome`: node origin on the cut plane, so the lift is a pure `position.y`.

Normals ship as int16 via `KHR_mesh_quantization`. Regenerate with `npm run build:model`. A Blender export with the same node names (+Z face, +Y up) is a drop-in replacement.

### 3.6 Studio lighting & render pipeline: the "designer" look

**No ambient light.** All lighting is in `Scene.tsx`:

```tsx
<Environment resolution={512} frames={1} environmentIntensity={0.85}>   {/* monochrome studio HDRI, baked once */}
  <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 1]}  scale={[10, 6, 1]} rotation-x={Math.PI / 2} /> {/* overhead softbox */}
  <Lightformer form="rect" intensity={1.4} color="#f4f4f2" position={[-6, 1, 3]} scale={[2, 9, 1]} />  {/* tall strip, left  */}
  <Lightformer form="rect" intensity={0.5} color="#e9ebee" position={[6, 0, 2]}  scale={[2, 7, 1]} />  {/* weak strip, right */}
  <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 2, -7]} scale={[12, 2, 1]} /> {/* back edge strip   */}
  <Lightformer form="rect" intensity={0.15} color="#d9dcdc" position={[0, -6, 0]} scale={[10, 10, 1]} /> {/* floor bounce */}
</Environment>
<directionalLight position={[-4, 5, 6]}   intensity={1.35} color="#fffaf3" />  {/* soft key            */}
<directionalLight position={[4.5, 3.5, -6]} intensity={3.2} color="#e6eef7" />  {/* cool rim: silhouette */}
```

The brand colour comes **only** from the core's own light.

**EffectComposer, in this order:**

```tsx
<Canvas gl={{ antialias: true }} …>
  <Selection>                                             {/* only <Select enabled> objects bloom */}
    <EffectComposer multisampling={4}>                    {/* MSAA on the HDR targets */}
      <DepthOfField target={focus} worldFocusRange={2.4} bokehScale={2.6} /> {/* focus locked on face/split every frame */}
      <LensEffect />                                     {/* cursor lens */}
      <SelectiveBloom mipmapBlur luminanceThreshold={0.32} luminanceSmoothing={0.28}
                      intensity={0.9} radius={0.55} levels={7} />  {/* tight fibre-optic halo, ignoreBackground */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />  {/* AFTER bloom → neon rolls off to white */}
      <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.12} /> {/* subtle grain */}
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  </Selection>
</Canvas>
```

**Why it doesn't look like a game:**
- **Selective bloom:** the porcelain, backdrop and type never bloom.
- **A threshold above the string bodies:** only pulses and the core flare.
- **Tone mapping after bloom:** no clipped RGB.
- **DOF:** the shoulders and dust fall into soft bokeh.
- **Monochrome lighting:** the shell stays white, not tinted.

Low tier (`?q=low`, mobile or `PerformanceMonitor` decline) drops DOF and MSAA.

### 3.7 Deliverable: the sync (GSAP timeline + R3F)

One clock. GSAP owns all easing and writes plain numbers to `motion.*`. R3F reads them every frame. The DOM fade and the head split share **the same timeline position and duration**, so "fully open" and "fully visible" are the same instant.

```ts
// lib/intro.ts
export const INTRO = { APPROACH: 3.4, SPLIT_AT: 1.5, SPLIT_DUR: 1.8, Z_START: -38 };
```

```ts
// components/dom/Preloader.tsx: master timeline (after the curtain glitch)
const UI = [document.getElementById("page"), ...document.querySelectorAll("[data-chrome]")];
tl.addLabel("open", "curtain+=0.32")
  .add(() => setPhase("reveal"), "open")
  .to(".loader-l", { xPercent: -102, duration: 1.3, ease: "expo.inOut" }, "open")   // curtain
  .to(".loader-r", { xPercent: 102,  duration: 1.3, ease: "expo.inOut" }, "open")
  .to(motion, { approach: 1, duration: APPROACH, ease: "expo.out" }, "open")       // ① Z axis
  .to(motion, { crack: 1, duration: 0.5, ease: "power2.in" }, `open+=${SPLIT_AT - 0.5}`)
  .to(motion, { split: 1, duration: SPLIT_DUR, ease: "power3.inOut" }, `open+=${SPLIT_AT}`) // ② dome lift
  .to(UI, { autoAlpha: 1, duration: SPLIT_DUR, ease: "power2.inOut" }, `open+=${SPLIT_AT}`); // ③ DOM fade
```

```tsx
// components/canvas/HeroRig.tsx: ① Z approach (eased value mapped linearly)
approach.position.set(0, -0.5 * (1 - a), INTRO.Z_START * (1 - a));
approach.rotation.x = 0.3 * (1 - a); // leaning in, "reaching" out of the screen

// components/canvas/HeroMannequin.tsx: ② the split on the GLTF Dome node
const { nodes } = useGLTF("/models/mannequin.glb");
useFrame(() => {
  const s = motion.split;
  dome.current.position.set(nodes.Dome.position.x, nodes.Dome.position.y + LIFT * s, nodes.Dome.position.z - 0.08 * s);
  dome.current.rotation.x = TILT * s;
});
```

**Measured in a real browser:** split and UI fade start on the same frame and end on the same frame (e.g. 1.60s → 3.08s after the curtain opens).

> **Why the dome is a node transform and not a morph target:** an earlier iteration hinged the head open like doors, which needed 3 shape keys to stay on the arc. A straight Y-lift is a rigid transform, so animating the separated `Dome` node is exact, cheaper and clearer. If a future model deforms (e.g. a sculpted crack), its morph targets plug into the same `motion.split` value.

### 3.8 Spring physics

`lib/spring.ts` is a semi-implicit Euler spring with 120Hz sub-stepping, deliberately under-damped so it overshoots and settles:
- **Head-turn:** heavy springs (k 40, c 9) follow the cursor slowly and slightly uncannily, nudged by scroll velocity.
- **Core wobble:** an under-damped spring kicked by scroll speed.
- **Traces:** orbit the ball slowly.

### 3.9 Nebula → beam (the reference's zoom-out)

Sparse dust motes carry a cloud position and a beam position. As the hero scrolls, the camera dollies back, the motes pour into a vertical light shaft through the opened skull, and the scene dims for the statement copy. Depth of field turns the dust into soft bokeh.

> **Implementation note:** all `ShaderMaterial`s are built with `new THREE.ShaderMaterial({ uniforms })` in a `useMemo`. Passing `uniforms` as a JSX prop to `<shaderMaterial>` left numeric uniforms frozen at their first value in this R3F version, which was verified and fixed.

---

## 4. Homepage wireframe

Every block is a `[data-section]` and counts as a "page" for the `[[00X]]` counter.

| Page | Counter | Section | Poster move | Conversion job |
|---|---|---|---|---|
| 001 | top-left | **HERO** (340vh sticky track) | Porcelain bust (right) splits open to reveal the AI core; headline + copy stacked left, never over the sculpture. Scroll = camera dolly-out, dust pours into a beam through the open skull, statement reveals word by word. | Primary CTA "Book a 20-min audit" |
| 002 | bottom-left | **01 · The busywork tax** | "YOUR TEAM IS DOING A ROBOT'S JOB." Six repetitive tasks, each **struck through by a beige bar** as you scroll. Flag Blue rule-of-thumb card. | Recognition: "that's my week" |
| 003 | top-right | **02 · The units** | Pinned horizontal track. 5 chamfered spec cards (INPUT / ACTION / OUTPUT, barcode, ONLINE), with beige colour-block cards on beats 2 and 4. | Product understanding |
| 004 | bottom-right | **03 · The protocol** | Full-bleed **Flag Blue block** constructed by a centre-out mask. "FOUR STEPS. ZERO CHAOS." scales up. Hazard stripe. 01–04 numerals. | De-risking |
| 005 | top-centre | **04 · Price your busywork** | Sliders, then a beige result block with a mega dollar figure counting up. | High-intent self-qualification |
| 006 | upper-right | **05 · Field reports** | Dashed "case file" cards. **Placeholders: replace with real results before launch.** | Social proof |
| 007 | bottom-centre | **06 · Questions owners ask** | Big-type accordion. | Objection handling |
| 008 | upper-left | **07 · Hand it off** | Camera flies back to the open bust. "HAND IT OFF." in mega type over it. | Final CTA → /booking |
| 009 | top-left | **Footer** | Beige block, cropped mega wordmark, hazard stripe. | Contact |

Routes: `/pricing` (bust left, the 5 agent hubs on the core labelled, plans on the right) and `/booking` (bust retreats far up-right and dims, form gets the stage).

---

## 5. Architecture & synchronization

### 5.1 The frame bridge

```
 Lenis ──velocity──┐                         ┌── useFrame (HeroRig, CameraRig, Lens)
 ScrollTrigger ────┼──► lib/motion.ts ───────┤
 Pointer events ───┤   (mutable, no React)   └── DOM writers (HUD, labels, cursor)
 Router/GSAP ──────┘
```

One clock: `gsap.ticker` drives Lenis (`lenis.raf`), ScrollTrigger reads Lenis, and R3F's loop reads `motion.*`. Scroll *is* the timeline. Every camera value is a pure function of `motion.hero`, `motion.cta`, `motion.intro` and `motion.stage`, then damped with `1 - exp(-dt·3.2)`, so it's frame-rate independent.

### 5.2 Seamless page routing (the Lusion transition method)

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

`lib/routes.ts` maps each route to a **stage**: camera position, FOV, look target, and the bust's position, rotation, scale, dim, label visibility and activity.

```ts
"/pricing": { camZ: 11.5, brainX: -3.4, brainRot: -0.9, labels: 1, dim: .85, … }, // bust swings left, hubs light up
"/booking": { camZ: 18,  brainX: 6.6, brainY: 3.4, dim: .5, … },                  // retreats up-right, dims
```

On navigation, GSAP tweens `motion.stage` to the new pose (`expo.inOut`, 1.8s) and tweens `motion.homeWeight` (1 on home, 0 elsewhere). `CameraRig` blends **home scroll choreography ↔ route pose** by `homeWeight`, so even leaving the homepage mid-scroll glides continuously.

The bust sits in nested groups, each owning one kind of motion: **stage** (route pose, tweened) → **approach** (intro Z travel) → **orient** (profile + spring head-turn). Route moves, the intro and pointer physics never fight. (`brainX/brainY/…` are legacy key names for the stage pose.)

#### c) DOM masking: slice shut, slice open

`components/transition/TransitionProvider.tsx` + `TransitionLink.tsx` (a drop-in `<Link>`).

```
t=0.00  click ─┬─ choreograph(target): camera + bust start moving THIS frame
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
| Brain hover | canvas | Raycast point → pathway + shell hotspot, activity spike |

## 7. Accessibility & fallbacks

- `prefers-reduced-motion`: Lenis lerp 1, no loader zoom or glitch, no warp, no pinned horizontal track, no scrubbed reveals.
- Touch devices: native cursor, no warp, no magnet. Agents section stacks vertically under 768px.
- All copy is real DOM text (SEO + screen readers). The canvas is decorative.
- The loader has `role="status"` and a 9s failsafe.

## 8. Before launch (TODO)

- [ ] Real agency name (`BRAND` in `lib/config.ts`)
- [ ] Real pricing (`PLANS`, currently `$—`)
- [ ] Real case studies (`FieldReports.tsx` placeholders)
- [ ] Booking form endpoint (Cal.com / Formspree / Cloudflare Worker)
- [ ] OG image, favicon, analytics
- [ ] Real-device QA (iPhone Safari, mid-range Android)
