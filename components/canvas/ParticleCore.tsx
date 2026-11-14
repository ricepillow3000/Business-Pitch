"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { particleFrag, particleVert, positionShader, velocityShader } from "./nebulaShaders";
import { COLORS } from "./shaders";
import { mulberry32 } from "@/lib/random";
import { extraSimSteps, gpgpuPointsGeometry, useGpgpu } from "@/lib/useGpgpu";
import { motion } from "@/lib/motion";
import { useStore } from "@/lib/store";

/** Nebula radius before ignition → once revealed it billows to NEBULA_OPEN (local units). */
export const NEBULA_RADIUS = 0.28;
export const NEBULA_OPEN = 0.95;

const FLAG = new THREE.Color(COLORS.flag);
const BEIGE = new THREE.Color(COLORS.beige);

/**
 * <ParticleCore/> — the orb: a GPGPU particle nebula.
 *
 *  size × size particles (512 → 262,144 on desktop, 256 → 65,536 on the low tier).
 *  Simulation (lib/useGpgpu.ts): position + velocity float FBOs ping-ponged on the GPU;
 *  the velocity pass is curl-noise turbulence + attract/repel fields (nebulaShaders.ts).
 *  Render: one THREE.Points draw call; each vertex fetches its texel (aRef).
 *  Additive blending → light accumulates where particles condense (the bright heart).
 */
export function ParticleCore({ size = 512, hoverAmt }: { size?: number; hoverAmt: { current: number } }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const count = size * size;

  const sim = useGpgpu({
    size,
    label: "orb",
    positionShader,
    velocityShader,
    init: (P, V, S, n) => {
      const rand = mulberry32(2026);
      for (let i = 0; i < n; i++) {
        const u = rand(), th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
        const r = NEBULA_RADIUS * Math.pow(u, 0.9) * 0.95;
        P.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.85, r * Math.sin(ph) * Math.sin(th), rand()], i * 4); // staggered lives
        V.set([0, 0, 0, rand()], i * 4); // w = per-particle seed
        const rs = NEBULA_RADIUS * 0.45 * Math.pow(rand(), 0.7);
        S.set([rs * Math.sin(ph) * Math.cos(th), rs * Math.cos(ph), rs * Math.sin(ph) * Math.sin(th), 1], i * 4);
      }
    },
    posUniforms: { uDt: { value: 0 } },
    velUniforms: {
      uTime: { value: 0 },
      uDt: { value: 0 },
      uRadius: { value: NEBULA_RADIUS },
      uActivity: { value: 0.4 },
      uOpen: { value: 0 },
      uPointer: { value: new THREE.Vector3(99, 99, 99) },
      uPointerStrength: { value: 0 },
      uBurst: { value: 0 },
      uAttractors: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
    },
  });

  const geometry = useMemo(() => gpgpuPointsGeometry(size, new THREE.Sphere(new THREE.Vector3(), NEBULA_RADIUS * 6)), [size]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVert,
        fragmentShader: particleFrag,
        uniforms: {
          uPositions: { value: null },
          uVelocities: { value: null },
          uSize: { value: 10 },
          uPixelRatio: { value: dpr },
          uRadius: { value: NEBULA_RADIUS },
          uTime: { value: 0 },
          uBlue: { value: FLAG.clone().multiplyScalar(11) },
          uBeige: { value: BEIGE.clone().multiplyScalar(1.1) },
          uIntensity: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [dpr],
  );

  // ── interaction state ──
  const pts = useRef<THREE.Points>(null);
  const burst = useRef(0);
  const frames = useRef(0);
  const ray = useMemo(() => ({ caster: new THREE.Raycaster(), plane: new THREE.Plane(), hit: new THREE.Vector3(), core: new THREE.Vector3(), n: new THREE.Vector3() }), []);
  useEffect(() => {
    // click anywhere that isn't a control → shockwave through the nebula
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("a, button, input, textarea, summary, label, [role=dialog]")) return;
      burst.current = 1;
    };
    addEventListener("pointerdown", onDown);
    return () => removeEventListener("pointerdown", onDown);
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state, delta) => {
    if (!sim.ok) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    const open = motion.reveal;
    const activity =
      0.35 + Math.min(Math.abs(motion.velocity) * 0.012, 1.2) + hoverAmt.current * 1.1 + motion.stage.activity * 0.5 + motion.cta * 0.6 + open * (1 - open) * 3;

    const vu = sim.velVar.material.uniforms;
    vu.uTime.value = t;
    vu.uDt.value = dt;
    vu.uActivity.value = activity;
    vu.uOpen.value = open;
    vu.uRadius.value = THREE.MathUtils.lerp(NEBULA_RADIUS, NEBULA_OPEN, open) * (1 + hoverAmt.current * 0.12);

    // cursor → a plane through the core facing the camera → core-local space
    const p = pts.current;
    if (p && motion.pointerUv.x >= 0) {
      p.getWorldPosition(ray.core);
      state.camera.getWorldDirection(ray.n);
      ray.plane.setFromNormalAndCoplanarPoint(ray.n, ray.core);
      ray.caster.setFromCamera(state.pointer, state.camera);
      if (ray.caster.ray.intersectPlane(ray.plane, ray.hit)) {
        (vu.uPointer.value as THREE.Vector3).copy(p.worldToLocal(ray.hit));
        vu.uPointerStrength.value = open * (0.35 + Math.min(motion.pointerSpeed / 40, 0.6));
      }
    }
    burst.current *= Math.exp(-dt * 3.5);
    vu.uBurst.value = burst.current * open;
    const R = NEBULA_RADIUS * 0.55;
    (vu.uAttractors.value as THREE.Vector3[]).forEach((a, i) => {
      const w = t * (0.35 + i * 0.17) + i * 2.1;
      a.set(Math.cos(w) * R, Math.sin(w * 1.3 + i) * R * 0.6, Math.sin(w) * R * (i === 1 ? -1 : 1));
    });
    sim.posVar.material.uniforms.uDt.value = dt;
    // reduced motion: let the nebula settle, then hold it still
    const frozen = useStore.getState().reducedMotion && ++frames.current > 90;
    if (!frozen) {
      sim.gpu.compute();
      for (let i = extraSimSteps(); i > 0; i--) sim.gpu.compute();
    }

    const mu = material.uniforms;
    const tex = sim.textures();
    mu.uTime.value = t;
    mu.uPositions.value = tex.pos;
    mu.uVelocities.value = tex.vel;
    // hundreds of particles overlap at the heart → a tiny per-particle value sums to a bright, TEXTURED core
    mu.uIntensity.value = (0.0004 + open * 0.0105) * (262144 / count) * (1 + activity * 0.08) * (1 + burst.current * 0.3) * (1 + hoverAmt.current * 0.35);
  });

  return <points ref={pts} geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
