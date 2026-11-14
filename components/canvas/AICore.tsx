"use client";

import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Select } from "@react-three/postprocessing";
import { createExitTraces, createTraces } from "./coreGeometry";
import { COLORS, patchStringMaterial } from "./shaders";
import { ParticleCore } from "./ParticleCore";
import { motion } from "@/lib/motion";
import { range } from "@/lib/spring";

/* HDR brand colours (linear, pre-ACES). The pipeline tone-maps AFTER bloom, so:
 *  • string bodies sit around luminance 0.3–0.6 → a thin halo, never a smear
 *  • travelling pulses + the nebula's dense centre exceed 1 → roll off to white-hot cores
 *    with coloured fringes (how real neon / fibre-optics photograph)
 * Flag Blue is very dark, so it is boosted ~10× to read as glowing Flag Blue. */
const FLAG = new THREE.Color(COLORS.flag);
const BEIGE = new THREE.Color(COLORS.beige);
const BLUE_HDR = FLAG.clone().multiplyScalar(10);
const BEIGE_HDR = BEIGE.clone().multiplyScalar(0.9);

function stringMaterial(uniforms: Record<string, { value: unknown }>) {
  const m = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  patchStringMaterial(m, uniforms);
  return m;
}

type CoreProps = { hover: THREE.Vector3; hoverAmt: { current: number }; traces: ReturnType<typeof createTraces>; particles?: number };

/**
 * THE AI CORE — sits in the cavity, centred just above the cut.
 *  1. Particle nebula: GPGPU simulation, curl noise, additive (ParticleCore.tsx) — the turbulent AI "brain"
 *  2. Strings of light: octilinear circuit traces that GROW OUT OF the nebula and form a brain silhouette
 *     (LineSegments + LineBasicMaterial) — fluid chaos inside, rigid geometric outputs outside
 *  3. Vias: solder-pad points at trace ends; 5 of them are the agent hubs (labels)
 * Everything is wrapped in <Select enabled> → only these objects bloom.
 */
export const AICore = forwardRef<THREE.Group, CoreProps>(function AICore({ hover, hoverAmt, traces, particles = 512 }, ref) {

  const stringUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uActivity: { value: 0.4 },
      uBase: { value: 0.3 }, // quiet bodies: the nebula is the star, strings are the structure
      uBlue: { value: BLUE_HDR },
      uBeige: { value: BEIGE_HDR },
      uHover: { value: hover },
      uHoverAmt: { value: 0 },
    }),
    [hover],
  );
  const lines = useMemo(() => stringMaterial(stringUniforms), [stringUniforms]);

  const viaMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: BEIGE.clone().multiplyScalar(1.2),
        size: 0.02,
        sizeAttenuation: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const split = motion.split;
    const activity =
      0.35 + Math.min(Math.abs(motion.velocity) * 0.012, 1.2) + hoverAmt.current * 0.8 + motion.hoverBoost * 0.6 + motion.cta * 0.8 + split * (1 - split) * 4;

    stringUniforms.uTime.value = t;
    // strings grow radially OUT of the nebula as the dome lifts (crack → full)
    stringUniforms.uReveal.value = Math.min(1, motion.crack * 0.15 + split * 1.05);
    stringUniforms.uActivity.value = activity;
    stringUniforms.uHoverAmt.value = hoverAmt.current;
    viaMaterial.opacity = range(split, 0.5, 1);

  });

  return (
    <group ref={ref}>
      <Select enabled>
        <ParticleCore size={particles} hoverAmt={hoverAmt} />
        <lineSegments geometry={traces.lines} material={lines} renderOrder={6} frustumCulled={false} />
        <points geometry={traces.vias} material={viaMaterial} renderOrder={7} />
      </Select>
    </group>
  );
});

/**
 * EXIT TRACES — strings that leave the head and run out across the page,
 * screen-aligned. They draw on after the split and extend further as the hero scrolls.
 */
export function ExitTraces() {
  const geo = useMemo(() => createExitTraces(8), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uActivity: { value: 0.4 },
      uBase: { value: 0.75 },
      uBlue: { value: BLUE_HDR },
      uBeige: { value: BEIGE_HDR },
      uHover: { value: new THREE.Vector3(99, 99, 99) },
      uHoverAmt: { value: 0 },
    }),
    [],
  );
  const mat = useMemo(() => {
    const m = stringMaterial(uniforms);
    m.depthWrite = true; // give exit traces real depth so the DOF keeps them in focus (not treated as background)
    return m;
  }, [uniforms]);
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    // 0 → 35% as the head opens, then snakes the rest of the way out on scroll
    uniforms.uReveal.value = range(motion.split, 0.6, 1) * 0.35 + range(motion.hero, 0.0, 0.35) * 0.65;
  });
  return (
    <Select enabled>
      <lineSegments geometry={geo} material={mat} frustumCulled={false} renderOrder={4} />
    </Select>
  );
}
