"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { particleFrag, particleVert, positionShader, velocityShader } from "./nebulaShaders";
import { COLORS } from "./shaders";
import { mulberry32 } from "./coreGeometry";
import { motion } from "@/lib/motion";

/** Nebula radius while sealed in the skull → once released it billows to NEBULA_OPEN. */
export const NEBULA_RADIUS = 0.28;
export const NEBULA_OPEN = 0.95; // billows well past the skull, around the lifted dome

const FLAG = new THREE.Color(COLORS.flag);
const BEIGE = new THREE.Color(COLORS.beige);

/**
 * <ParticleCore/> — the AI core as a GPGPU particle nebula.
 *
 *  size × size particles (512 → 262,144 on desktop, 256 → 65,536 on the low tier).
 *  Simulation: GPUComputationRenderer ping-pongs position + velocity float FBOs;
 *  the velocity pass is curl-noise turbulence + attract/repel fields (nebulaShaders.ts).
 *  Render: one THREE.Points draw call; each vertex fetches its texel (aRef).
 *  Additive blending → light accumulates where particles condense.
 */
export function ParticleCore({ size = 512, hoverAmt }: { size?: number; hoverAmt: { current: number } }) {
  const gl = useThree((s) => s.gl);
  const dpr = useThree((s) => s.viewport.dpr);
  const count = size * size;

  const sim = useMemo(() => {
    const gpu = new GPUComputationRenderer(size, size, gl);
    // Full float where the GPU can render to it; half float otherwise (older iOS)
    if (!gl.extensions.has("EXT_color_buffer_float")) gpu.setDataType(THREE.HalfFloatType);

    const rand = mulberry32(2026);
    const pos0 = gpu.createTexture();
    const vel0 = gpu.createTexture();
    const spawn = gpu.createTexture();
    const P = pos0.image.data as Float32Array, V = vel0.image.data as Float32Array, S = spawn.image.data as Float32Array;
    for (let i = 0; i < count; i++) {
      // dense centre: radius ∝ u³ (most particles near the middle)
      const u = rand(), th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
      const r = NEBULA_RADIUS * Math.pow(u, 0.9) * 0.95; // looser: a gradient, not a cotton ball
      const x = r * Math.sin(ph) * Math.cos(th), y = r * Math.cos(ph) * 0.85, z = r * Math.sin(ph) * Math.sin(th);
      P.set([x, y, z, rand()], i * 4); // staggered lives → no synchronized respawn waves
      V.set([0, 0, 0, rand()], i * 4); // w = per-particle seed
      const rs = NEBULA_RADIUS * 0.45 * Math.pow(rand(), 0.7);
      S.set([rs * Math.sin(ph) * Math.cos(th), rs * Math.cos(ph), rs * Math.sin(ph) * Math.sin(th), 1], i * 4);
    }

    const posVar = gpu.addVariable("texturePosition", positionShader, pos0);
    const velVar = gpu.addVariable("textureVelocity", velocityShader, vel0);
    gpu.setVariableDependencies(posVar, [posVar, velVar]);
    gpu.setVariableDependencies(velVar, [posVar, velVar]);
    Object.assign(posVar.material.uniforms, { uDt: { value: 0 }, uSpawn: { value: spawn } });
    Object.assign(velVar.material.uniforms, {
      uTime: { value: 0 },
      uDt: { value: 0 },
      uRadius: { value: NEBULA_RADIUS },
      uActivity: { value: 0.4 },
      uOpen: { value: 0 },
      uPointer: { value: new THREE.Vector3(99, 99, 99) },
      uPointerStrength: { value: 0 },
      uBurst: { value: 0 },
      uAttractors: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
    });
    const err = gpu.init();
    if (err) console.error("[ParticleCore] GPGPU init failed:", err);
    return { gpu, posVar, velVar, spawn, ok: !err };
  }, [gl, size, count]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const ref = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      ref[i * 2] = ((i % size) + 0.5) / size;
      ref[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
    }
    g.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
    // positions live in a texture; a dummy attribute satisfies three, and a fixed bound avoids culling
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), NEBULA_RADIUS * 3);
    return g;
  }, [count, size]);

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
          // keep total light constant across particle counts (fewer particles → each brighter)
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
  const ray = useMemo(() => ({ caster: new THREE.Raycaster(), plane: new THREE.Plane(), hit: new THREE.Vector3(), core: new THREE.Vector3(), n: new THREE.Vector3() }), []);
  useEffect(() => {
    // click anywhere that isn't a control → shockwave through the nebula
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("a, button, input, textarea, summary, label")) return;
      burst.current = 1;
    };
    addEventListener("pointerdown", onDown);
    return () => removeEventListener("pointerdown", onDown);
  }, []);

  useEffect(
    () => () => {
      sim.gpu.dispose();
      sim.spawn.dispose();
      geometry.dispose();
      material.dispose();
    },
    [sim, geometry, material],
  );

  useFrame((state, delta) => {
    if (!sim.ok) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    const split = motion.split;
    const activity =
      0.35 + Math.min(Math.abs(motion.velocity) * 0.012, 1.2) + hoverAmt.current * 0.9 + motion.hoverBoost * 0.5 + motion.cta * 0.6 + split * (1 - split) * 3;

    const vu = sim.velVar.material.uniforms;
    vu.uTime.value = t;
    vu.uDt.value = dt;
    vu.uActivity.value = activity;
    vu.uOpen.value = split;
    vu.uRadius.value = THREE.MathUtils.lerp(NEBULA_RADIUS, NEBULA_OPEN, split);

    // cursor → a plane through the core facing the camera → core-local space
    const p = pts.current;
    if (p && motion.pointerUv.x >= 0) {
      p.getWorldPosition(ray.core);
      state.camera.getWorldDirection(ray.n);
      ray.plane.setFromNormalAndCoplanarPoint(ray.n, ray.core);
      ray.caster.setFromCamera(state.pointer, state.camera);
      if (ray.caster.ray.intersectPlane(ray.plane, ray.hit)) {
        (vu.uPointer.value as THREE.Vector3).copy(p.worldToLocal(ray.hit));
        vu.uPointerStrength.value = split * (0.35 + Math.min(motion.pointerSpeed / 40, 0.6));
      }
    }
    burst.current *= Math.exp(-dt * 3.5);
    vu.uBurst.value = burst.current * split;
    // three attractors orbiting on tilted rings inside the cavity
    const R = NEBULA_RADIUS * 0.55;
    (vu.uAttractors.value as THREE.Vector3[]).forEach((a, i) => {
      const w = t * (0.35 + i * 0.17) + i * 2.1;
      a.set(Math.cos(w) * R, Math.sin(w * 1.3 + i) * R * 0.6, Math.sin(w) * R * (i === 1 ? -1 : 1));
    });
    sim.posVar.material.uniforms.uDt.value = dt;
    sim.gpu.compute();
    // dev-only: fast-forward the simulation (slow headless renderers / inspecting the settled look)
    if (process.env.NODE_ENV !== "production") {
      const extra = (window as unknown as { __simSteps?: number }).__simSteps ?? 0;
      for (let i = 0; i < extra; i++) sim.gpu.compute();
    }

    const mu = material.uniforms;
    mu.uTime.value = t;
    mu.uPositions.value = sim.gpu.getCurrentRenderTarget(sim.posVar).texture;
    mu.uVelocities.value = sim.gpu.getCurrentRenderTarget(sim.velVar).texture;
    // dim glow through the closed skull → full nebula once released
    // hundreds of particles overlap at the heart → a tiny per-particle value sums to a bright, TEXTURED core (≈2–3 HDR)
    mu.uIntensity.value = (0.0025 + motion.crack * 0.004 + split * 0.0085) * (262144 / count) * (1 + activity * 0.08) * (1 + burst.current * 0.3);
  });

  return <points ref={pts} geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
