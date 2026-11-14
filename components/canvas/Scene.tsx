"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { DepthOfField, EffectComposer, Noise, Selection, SelectiveBloom, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import { HeroRig } from "./HeroRig";
import { LensEffect } from "./LensEffect";
import { COLORS, backdropFrag, backdropVert } from "./shaders";
import { focusPoint, motion } from "@/lib/motion";
import { easeInOut, lerp, range } from "@/lib/spring";

/** Fullscreen Dark-Slate radial backdrop (drawn behind everything, refracted by the glass). */
function Backdrop() {
  const size = useThree((s) => s.size);
  const uniforms = useMemo(
    () => ({
      uVoid: { value: new THREE.Color(COLORS.void) },
      uSlate: { value: new THREE.Color(COLORS.slate) },
      uAspect: { value: 1 },
      uGlow: { value: 1 },
    }),
    [],
  );
  const material = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: backdropVert, fragmentShader: backdropFrag, uniforms, depthWrite: false, depthTest: false }),
    [uniforms],
  );
  useFrame(() => {
    uniforms.uAspect.value = size.width / size.height;
    uniforms.uGlow.value = 1 - range(motion.hero, 0.6, 1) * 0.6 + motion.cta * 0.6;
  });
  return (
    <mesh frustumCulled={false} renderOrder={-10} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/**
 * Camera choreography. Every value is a pure function of scroll state
 * (motion.hero / motion.cta / motion.intro) → then damped. Scroll is the timeline.
 */
function CameraRig({ dim }: { dim: { current: number } }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const intro = easeInOut(motion.intro);
    const st = motion.stage;
    const w = motion.homeWeight; // 1 = home scroll choreography, 0 = route preset

    // HOME: scroll is the timeline — close-up → pull back into the void → return at CTA
    const h = easeInOut(range(motion.hero, 0, 0.82));
    const c = easeInOut(motion.cta);
    // framed on head + shoulders; pull back until the bust is a figure in the void
    // BIG: head + shoulders fill the viewport (shoulders cropped like the reference),
    // with headroom for the lifted dome; pull back until it's a figure in the void
    let hz = lerp(6.0, 17, h);
    let hy = lerp(0.15, 1.4, h);
    let hf = lerp(38, 30, h); // slight dolly-zoom for the "heavy" feel
    hz = lerp(hz, st.camZ, c);
    hy = lerp(hy, st.camY, c);
    hf = lerp(hf, st.fov, c);
    const hLook = lerp(lerp(0.05, 0.6, h), st.lookY, c);
    const hDim = Math.min(1, 1 - range(motion.hero, 0.72, 1) * 0.6 + range(motion.cta, 0.1, 0.9) * 0.6);

    // blend home ↔ route preset (motion.stage is itself tweened on navigation)
    let z = lerp(st.camZ, hz, w);
    const y = lerp(st.camY, hy, w);
    const x = lerp(st.camX, 0, w);
    const fov = lerp(st.fov, hf, w);
    const lookY = lerp(st.lookY, hLook, w);
    const targetDim = lerp(st.dim, hDim, w);

    const px = motion.pointer.x * lerp(0.28, 0.6, h * w);
    const py = motion.pointer.y * lerp(0.16, 0.4, h * w);
    target.set(x + px, y + py, z);

    const k = 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(target, k);
    look.set(lerp(st.lookX, 0, w), lookY, 0);
    camera.lookAt(look);
    camera.fov += (fov - camera.fov) * k;
    camera.updateProjectionMatrix();

    dim.current += (targetDim * intro - dim.current) * k;
  });
  return null;
}

/** Keeps the DOF focus locked on the face/split as the bust moves (route poses, approach, hero shift). */
function FocusSync({ dof }: { dof: React.RefObject<DepthOfFieldEffect | null> }) {
  useFrame(() => {
    const t = dof.current?.target;
    if (t) t.copy(focusPoint);
  });
  return null;
}

export default function Scene() {
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [dpr, setDpr] = useState(1.5);
  const dim = useRef(0);
  const rimLight = useRef<THREE.DirectionalLight>(null!); // SelectiveBloom wants ≥1 light ref; the bloomed objects are unlit
  const dof = useRef<DepthOfFieldEffect>(null);

  useEffect(() => {
    // ?q=low forces the cheap path (handy for testing on weak GPUs / headless)
    if (window.matchMedia("(max-width: 768px)").matches || new URLSearchParams(location.search).get("q") === "low") {
      setQuality("low");
      setDpr(1);
    }
  }, []);

  return (
    <Canvas
      className="!fixed inset-0 z-0"
      dpr={dpr}
      // antialias for the default framebuffer; the composer's own MSAA (multisampling) does the real work
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false, stencil: false }}
      camera={{ fov: 38, position: [0, 0.15, 6.0], near: 0.05, far: 100 }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          setQuality("low");
        }}
      />
      <color attach="background" args={[COLORS.void]} />
      {/* the bust emerges from darkness: far = void colour */}
      <fog attach="fog" args={[COLORS.void, 9, 46]} />
      <Backdrop />

      {/* ── STUDIO LIGHTING ─────────────────────────────────────────────
          No ambient light. A soft MONOCHROMATIC studio HDRI (baked once from
          neutral softboxes — no download) gives realistic reflections and the
          porcelain's Fresnel; one soft key models the form; one cool rim light
          separates the silhouette from the Dark Slate Gray void. Brand colour
          comes ONLY from the core's own light. */}
      <Environment resolution={512} frames={1} environmentIntensity={0.85}>
        {/* overhead softbox (main reflection on the dome) */}
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 1]} scale={[10, 6, 1]} rotation-x={Math.PI / 2} />
        {/* tall strip, camera-left: long vertical highlight down the profile */}
        <Lightformer form="rect" intensity={1.4} color="#f4f4f2" position={[-6, 1, 3]} scale={[2, 9, 1]} rotation-y={Math.PI / 2.4} />
        {/* weaker strip, camera-right: keeps the shadow side from going dead */}
        <Lightformer form="rect" intensity={0.5} color="#e9ebee" position={[6, 0, 2]} scale={[2, 7, 1]} rotation-y={-Math.PI / 2.4} />
        {/* back strip: edge reflections that trace the silhouette */}
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 2, -7]} scale={[12, 2, 1]} />
        {/* faint floor bounce */}
        <Lightformer form="rect" intensity={0.15} color="#d9dcdc" position={[0, -6, 0]} scale={[10, 10, 1]} rotation-x={-Math.PI / 2} />
      </Environment>
      {/* key: large, soft, slightly warm, high camera-left */}
      <directionalLight position={[-4, 5, 6]} intensity={1.35} color="#fffaf3" />
      {/* rim: cool, from behind camera-right → crisp silhouette edge against the slate */}
      <directionalLight ref={rimLight} position={[4.5, 3.5, -6]} intensity={3.2} color="#e6eef7" />

      {/* Selection: only objects inside <Select enabled> (ball of light, strings, vias) bloom.
          The porcelain, the backdrop and everything else never do. */}
      <Selection>
        <Suspense fallback={null}>
          <HeroRig quality={quality} />
        </Suspense>
        <CameraRig dim={dim} />
        <FocusSync dof={dof} />

        {/* ── RENDER PIPELINE (order matters) ──────────────────────────────
            1 DOF         — shallow focus locked on the face/split; shoulders + far dust fall off
            2 Lens        — cursor lens (samples the focused image)
            3 Bloom       — SELECTIVE, HDR-only: fibre-optic glow, not RGB sludge
            4 ACES Filmic — tone map AFTER bloom so neon cores roll off to white-hot
            5 Grain + vignette — display-referred, last */}
        <EffectComposer multisampling={quality === "high" ? 4 : 0} enableNormalPass={false}>
          {quality === "high" ? <DepthOfField ref={dof} target={[0, 0, 0]} worldFocusRange={2.4} bokehScale={2.6} /> : <></>}
          <LensEffect dim={dim} />
          <SelectiveBloom
            ref={(e) => {
              if (e) e.ignoreBackground = true;
            }}
            lights={[rimLight]}
            mipmapBlur
            luminanceThreshold={0.32}
            luminanceSmoothing={0.28}
            intensity={0.9}
            radius={0.55}
            levels={7}
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.12} />
          <Vignette offset={0.3} darkness={0.55} />
        </EffectComposer>
      </Selection>
    </Canvas>
  );
}
