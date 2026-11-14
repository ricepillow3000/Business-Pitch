"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { DepthOfField, EffectComposer, Noise, Selection, SelectiveBloom, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import { MoonScene, type Quality } from "./moon/MoonScene";
import { ORB_Y } from "./moon/constants";
import { LensEffect } from "./LensEffect";
import { COLORS } from "./shaders";
import { focusPoint, motion } from "@/lib/motion";
import { easeInOut, lerp, range } from "@/lib/spring";

const FOCUS_OFFSET = {
  // camera eases toward the clicked object; the panel covers the right, so the object sits left of centre
  core: { cam: new THREE.Vector3(1.45, ORB_Y + 0.35, 5.6), look: new THREE.Vector3(1.3, ORB_Y - 0.55, 0) },
  engine: { cam: new THREE.Vector3(1.5, 1.5, 6.2), look: new THREE.Vector3(1.35, 0.7, 0) },
};

/**
 * Camera choreography. Every value is a pure function of scroll state
 * (motion.hero / motion.cta / motion.reveal / motion.focus) → then damped. Scroll is the timeline.
 */
function CameraRig({ dim }: { dim: { current: number } }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const fTarget = useMemo(() => new THREE.Vector3(), []);
  const fLook = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const reveal = easeInOut(motion.reveal);
    const st = motion.stage;
    const w = motion.homeWeight; // 1 = home scroll choreography, 0 = route preset

    // HOME: low in the valley → dolly back and up until the orb, beam and storm are
    // a small lit point in a vast moonscape → return at the CTA
    const h = easeInOut(range(motion.hero, 0, 0.85));
    const c = easeInOut(motion.cta);
    let hz = lerp(st.camZ, 36, h);
    let hy = lerp(st.camY, 11, h);
    let hf = lerp(st.fov, 40, h);
    let hLook = lerp(st.lookY, 0.4, h);
    hz = lerp(hz, st.camZ, c);
    hy = lerp(hy, st.camY, c);
    hf = lerp(hf, st.fov, c);
    hLook = lerp(hLook, st.lookY, c);
    const hDim = Math.min(1, 1 - range(motion.hero, 0.6, 1) * 0.45 + range(motion.cta, 0.1, 0.9) * 0.45);

    // blend home ↔ route preset (motion.stage is itself tweened on navigation)
    let z = lerp(st.camZ, hz, w);
    let y = lerp(st.camY, hy, w);
    let x = st.camX;
    const fov = lerp(st.fov, hf, w);
    let lookY = lerp(st.lookY, hLook, w);
    let lookX = st.lookX;
    const targetDim = lerp(st.dim, hDim, w);

    // intro: the camera starts closer and lower and settles back as the scene reveals
    z -= (1 - reveal) * 3.2;
    y -= (1 - reveal) * 0.6;

    const px = motion.pointer.x * lerp(0.25, 0.8, h * w);
    const py = motion.pointer.y * lerp(0.12, 0.5, h * w);
    target.set(x + px, y + py, z);
    look.set(lookX, lookY, 0);

    // info panel open → ease toward the clicked object
    const f = easeInOut(motion.focus);
    if (f > 0.001) {
      const o = FOCUS_OFFSET[motion.focusTarget];
      fTarget.set(st.subjectX, 0, 0).add(o.cam);
      fLook.set(st.subjectX, 0, 0).add(o.look);
      target.lerp(fTarget, f);
      look.lerp(fLook, f);
      x = target.x; y = target.y; z = target.z; lookX = look.x; lookY = look.y;
    }

    const k = 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(target, k);
    camera.lookAt(look);
    camera.fov += (fov - camera.fov) * k;
    camera.updateProjectionMatrix();

    dim.current += (targetDim * (0.2 + 0.8 * reveal) - dim.current) * k;
  });
  return null;
}

/** Keeps the DOF focus locked on the orb as it moves (route poses, scroll). */
function FocusSync({ dof }: { dof: React.RefObject<DepthOfFieldEffect | null> }) {
  useFrame(() => {
    const t = dof.current?.target;
    if (t) t.copy(focusPoint);
  });
  return null;
}

export default function Scene() {
  const [quality, setQuality] = useState<Quality>("high");
  const [dpr, setDpr] = useState(1.5);
  const dim = useRef(0);
  const moonLight = useRef<THREE.DirectionalLight>(null!); // SelectiveBloom wants ≥1 light ref; the bloomed objects are unlit
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
      camera={{ fov: 34, position: [0, 1.1, 6.3], near: 0.05, far: 400 }}
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
      {/* distance haze = the sky's horizon colour, so the ridges melt into the night */}
      <fog attach="fog" args={[COLORS.haze, 16, 120]} />

      {/* ── LIGHTING ─────────────────────────────────────────────────────
          No ambient light. The orb's PointLight and the beam's SpotLight (inside
          MoonScene) carry the scene; a faint cool directional "moonlight" from
          behind-left rims the ridges. A soft monochrome studio env (baked once,
          no download) at low intensity keeps shadow sides from going dead. */}
      <Environment resolution={256} frames={1} environmentIntensity={0.12}>
        <Lightformer form="rect" intensity={2} color="#ffffff" position={[0, 6, 1]} scale={[10, 6, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.8} color="#e9ebee" position={[0, 2, -7]} scale={[12, 2, 1]} />
      </Environment>
      <directionalLight ref={moonLight} position={[-8, 18, -26]} intensity={1.1} color="#b4c0d0" />

      <Selection>
        <MoonScene quality={quality} />
        <CameraRig dim={dim} />
        <FocusSync dof={dof} />

        {/* ── RENDER PIPELINE (order matters) ──────────────────────────────
            1 DOF         — focus locked on the orb; near ground + far ridges fall off
            2 Lens        — cursor lens (samples the focused image)
            3 Bloom       — SELECTIVE, HDR-only: orb/beam glow, not RGB sludge
            4 ACES Filmic — tone map AFTER bloom so neon cores roll off to white-hot
            5 Grain + vignette — display-referred, last */}
        <EffectComposer multisampling={quality === "high" ? 4 : 0} enableNormalPass={false}>
          {quality === "high" ? <DepthOfField ref={dof} target={[0, ORB_Y, 0]} worldFocusRange={7} bokehScale={2.2} /> : <></>}
          <LensEffect dim={dim} />
          <SelectiveBloom
            ref={(e) => {
              if (e) e.ignoreBackground = true;
            }}
            lights={[moonLight]}
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
