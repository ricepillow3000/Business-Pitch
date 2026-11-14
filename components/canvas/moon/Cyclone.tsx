"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Select } from "@react-three/postprocessing";
import { COLORS } from "../shaders";
import { CYCLONE_H } from "./constants";
import { cycloneFrag, cycloneVert, ribbonFrag, ribbonVert } from "./moonShaders";
import { mulberry32 } from "@/lib/random";
import { motion } from "@/lib/motion";

const RIBBONS = 5;
const RIBBON_SEGS = 220;

/**
 * Ethereal cyclone under the orb: an analytic vertex-shader vortex (no simulation —
 * every particle's helix is a pure function of time) plus a few faint helical
 * ribbons. Flag Blue ↔ Beige, additive, bloomed. Hover spins it up.
 */
export function Cyclone({ count, hoverAmt }: { count: number; hoverAmt: { current: number } }) {
  const dpr = useThree((s) => s.viewport.dpr);

  const shared = useMemo(
    () => ({ uTime: { value: 0 }, uPhase: { value: 0 }, uHeight: { value: CYCLONE_H }, uReveal: { value: 0 } }),
    [],
  );

  const points = useMemo(() => {
    const rand = mulberry32(9);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
    const g = new THREE.BufferGeometry();
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, CYCLONE_H / 2, 0), CYCLONE_H);
    const m = new THREE.ShaderMaterial({
      vertexShader: cycloneVert,
      fragmentShader: cycloneFrag,
      uniforms: {
        ...shared,
        uSpin: { value: 1 },
        uSize: { value: 7 },
        uPixelRatio: { value: dpr },
        uBlue: { value: new THREE.Color(COLORS.flag).multiplyScalar(9) },
        uBeige: { value: new THREE.Color(COLORS.beige) },
        // keep the total light the same across tiers
        uIntensity: { value: 0.03 * (40000 / count) },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    return { g, m };
  }, [count, dpr, shared]);

  const ribbons = useMemo(() => {
    const t: number[] = [], id: number[] = [];
    for (let r = 0; r < RIBBONS; r++)
      for (let j = 0; j < RIBBON_SEGS; j++) {
        t.push(j / RIBBON_SEGS, (j + 1) / RIBBON_SEGS);
        id.push(r, r);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
    g.setAttribute("aRibbon", new THREE.Float32BufferAttribute(id, 1));
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(t.length * 3), 3));
    g.boundingSphere = points.g.boundingSphere!.clone();
    const m = new THREE.ShaderMaterial({
      vertexShader: ribbonVert,
      fragmentShader: ribbonFrag,
      uniforms: { ...shared, uBeige: { value: new THREE.Color(COLORS.beige) }, uIntensity: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    return { g, m };
  }, [shared, points]);

  useEffect(() => () => { points.g.dispose(); points.m.dispose(); ribbons.g.dispose(); ribbons.m.dispose(); }, [points, ribbons]);

  useFrame((state, delta) => {
    const h = hoverAmt.current;
    const spin = 1 + h * 1.6 + motion.stage.activity * 0.6;
    shared.uTime.value = state.clock.elapsedTime;
    shared.uPhase.value += Math.min(delta, 0.05) * (spin - 1) * 2.2; // extra rigid spin while hovered
    shared.uReveal.value = motion.reveal;
    points.m.uniforms.uSpin.value = 1;
    points.m.uniforms.uIntensity.value = 0.03 * (40000 / count) * (1 + h * 0.6);
    ribbons.m.uniforms.uIntensity.value = 1 + h * 1.2;
  });

  return (
    <Select enabled>
      <points geometry={points.g} material={points.m} frustumCulled={false} renderOrder={4} />
      <lineSegments geometry={ribbons.g} material={ribbons.m} frustumCulled={false} renderOrder={4} />
    </Select>
  );
}
