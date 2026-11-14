"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Brain } from "./Brain";
import { LensEffect } from "./LensEffect";
import { COLORS, backdropFrag, backdropVert } from "./shaders";
import { motion } from "@/lib/motion";
import { easeInOut, lerp, range } from "@/lib/spring";
import { useStore } from "@/lib/store";

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
  useFrame(() => {
    uniforms.uAspect.value = size.width / size.height;
    uniforms.uGlow.value = 1 - range(motion.hero, 0.6, 1) * 0.6 + motion.cta * 0.6;
  });
  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={backdropVert} fragmentShader={backdropFrag} uniforms={uniforms} depthWrite={false} depthTest={false} />
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
  const ready = useRef(0);
  const setSceneReady = useStore((s) => s.setSceneReady);

  useFrame((_, dt) => {
    if (ready.current < 3 && ++ready.current === 3) setSceneReady();

    const intro = easeInOut(motion.intro);
    const st = motion.stage;
    const w = motion.homeWeight; // 1 = home scroll choreography, 0 = route preset

    // HOME: scroll is the timeline — close-up → pull back into the void → return at CTA
    const h = easeInOut(range(motion.hero, 0, 0.82));
    const c = easeInOut(motion.cta);
    let hz = lerp(2.35, 14, h);
    let hy = lerp(0.05, 1.6, h);
    let hf = lerp(38, 30, h); // slight dolly-zoom for the "heavy" feel
    hz = lerp(hz, st.camZ, c);
    hy = lerp(hy, st.camY, c);
    hf = lerp(hf, st.fov, c);
    const hLook = lerp(0, 1.4, h * (1 - c));
    const hDim = Math.min(1, 1 - range(motion.hero, 0.72, 1) * 0.6 + range(motion.cta, 0.1, 0.9) * 0.6);

    // blend home ↔ route preset (motion.stage is itself tweened on navigation)
    let z = lerp(st.camZ, hz, w);
    const y = lerp(st.camY, hy, w);
    const x = lerp(st.camX, 0, w);
    const fov = lerp(st.fov, hf, w);
    const lookY = lerp(st.lookY, hLook, w);
    const targetDim = lerp(st.dim, hDim, w);

    // intro: start inside the glass, drift out
    z -= (1 - intro) * 1.9;

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

export default function Scene() {
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [dpr, setDpr] = useState(1.5);
  const dim = useRef(0);

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
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false }}
      camera={{ fov: 38, position: [0, 0, 0.6], near: 0.05, far: 100 }}
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
      <Backdrop />

      {/* On-brand reflections, no HDR download: beige + blue softboxes baked once */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color={COLORS.beige} position={[0, 4, -3]} scale={[8, 1.2, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={2} color={COLORS.signal} position={[-5, 0, 1]} scale={[1.5, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.4} color={COLORS.beige} position={[5, 1, 2]} scale={[1, 4, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="ring" intensity={1.5} color={COLORS.signal} position={[0, 0, 6]} scale={3} />
      </Environment>

      <Brain quality={quality} />
      <CameraRig dim={dim} />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <LensEffect dim={dim} />
        <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.2} intensity={1.15} radius={0.75} />
        <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.35} />
        <Vignette offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
