"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { COLORS } from "../shaders";
import { DUST_RADIUS, ORB_Y } from "./constants";
import { dustFrag, dustPositionShader, dustVelocityShader, dustVert } from "./moonShaders";
import { mulberry32 } from "@/lib/random";
import { extraSimSteps, gpgpuPointsGeometry, useGpgpu } from "@/lib/useGpgpu";
import { motion } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { range } from "@/lib/spring";

const ringPoint = (rand: () => number, rMin: number, rMax: number): [number, number] => {
  // uniform over the annulus area
  const r = Math.sqrt(rMin * rMin + rand() * (rMax * rMax - rMin * rMin));
  const a = rand() * Math.PI * 2;
  return [Math.cos(a) * r, Math.sin(a) * r];
};

/**
 * Wind-blown dust (GPGPU, 256² high / 128² low). A gust blasts outward from where the
 * beam hits: particles hug terrainHeight, get kicked up near the impact, settle as they
 * fly out, and respawn near the impact. A reveal burst spreads it all apart at once.
 */
export function GroundDust({ size, stormAmt }: { size: number; stormAmt: { current: number } }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const count = size * size;
  const frames = useRef(0);

  const sim = useGpgpu({
    size,
    label: "dust",
    positionShader: dustPositionShader,
    velocityShader: dustVelocityShader,
    init: (P, V, S, n) => {
      const rand = mulberry32(77);
      for (let i = 0; i < n; i++) {
        // start spread across the valley (settled), born near the impact afterwards
        const [x, z] = ringPoint(rand, 0.4, DUST_RADIUS * 0.9);
        P.set([x, 0.02, z, rand()], i * 4);
        V.set([0, 0, 0, rand()], i * 4);
        const near = rand() < 0.55;
        const [sx, sz] = near ? ringPoint(rand, 0.15, 1.3) : ringPoint(rand, 1.3, DUST_RADIUS * 0.85);
        S.set([sx, 0, sz, 1], i * 4);
      }
    },
    posUniforms: { uDt: { value: 0 }, uRadius: { value: DUST_RADIUS } },
    velUniforms: { uTime: { value: 0 }, uDt: { value: 0 }, uReveal: { value: 0 }, uGust: { value: 0 }, uStorm: { value: 0 } },
  });

  const geometry = useMemo(() => gpgpuPointsGeometry(size, new THREE.Sphere(new THREE.Vector3(), DUST_RADIUS + 4)), [size]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVert,
        fragmentShader: dustFrag,
        uniforms: {
          uPositions: { value: null },
          uVelocities: { value: null },
          uSize: { value: 9 },
          uPixelRatio: { value: dpr },
          uOrbY: { value: ORB_Y },
          uRadius: { value: DUST_RADIUS },
          uColor: { value: new THREE.Color("#d9d8cc") },
          uIntensity: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [dpr],
  );
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state, delta) => {
    if (!sim.ok) return;
    const dt = Math.min(delta, 1 / 30);
    const r = motion.reveal;
    const vu = sim.velVar.material.uniforms;
    vu.uTime.value = state.clock.elapsedTime;
    vu.uDt.value = dt;
    vu.uReveal.value = Math.max(r, 0.0001);
    // the strike's blast: a big gust as the beam lands, then the steady wind
    vu.uGust.value = Math.sin(Math.PI * range(r, 0.4, 0.95)) * 2.2 + motion.stage.activity * 0.4;
    vu.uStorm.value = stormAmt.current * 1.5;
    sim.posVar.material.uniforms.uDt.value = dt;
    const frozen = useStore.getState().reducedMotion && ++frames.current > 90;
    if (!frozen) {
      sim.gpu.compute();
      for (let i = extraSimSteps(); i > 0; i--) sim.gpu.compute();
    }
    const tex = sim.textures();
    material.uniforms.uPositions.value = tex.pos;
    material.uniforms.uVelocities.value = tex.vel;
    material.uniforms.uIntensity.value = 0.045 * Math.sqrt(65536 / count) * r;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
