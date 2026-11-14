"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Select } from "@react-three/postprocessing";
import { COLORS } from "../shaders";
import { BEAM_TOP } from "./constants";
import { billboard, makeGlow } from "./glow";
import { beamFrag, beamVert } from "./moonShaders";
import { motion } from "@/lib/motion";
import { range } from "@/lib/spring";

/**
 * The shaft of light from the orb to the ground: an open cone with a view-dependent
 * core and scrolling noise, an impact flare lying on the ground, a small upright
 * glint where it hits, and a SpotLight down the beam (the real pool of light).
 */
export function LightBeam({ hoverAmt }: { hoverAmt: { current: number } }) {
  const spot = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const glint = useRef<THREE.Mesh>(null);

  const beam = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 }, uStrike: { value: 0 }, uIntensity: { value: 0 },
      uBeige: { value: new THREE.Color(COLORS.beige) },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: beamVert, fragmentShader: beamFrag, uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    return { uniforms, material };
  }, []);
  const flare = useMemo(() => makeGlow(COLORS.beige, 7, 1.4), []);
  const spark = useMemo(() => makeGlow(COLORS.beige, 9), []);

  useEffect(() => {
    if (spot.current) spot.current.target = target;
  }, [target]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const strike = range(motion.reveal, 0.12, 0.42);
    const landed = range(motion.reveal, 0.4, 0.5);
    // a hit flash on landing that settles to a steady burn
    const flash = landed * (1 + 2.5 * Math.exp(-range(motion.reveal, 0.42, 0.9) * 5) * (motion.reveal < 1 ? 1 : 0));
    const h = hoverAmt.current;
    const pulse = 1 + Math.sin(t * 3.1) * 0.06;
    beam.uniforms.uTime.value = t;
    beam.uniforms.uStrike.value = strike;
    beam.uniforms.uIntensity.value = 1.15 * (1 + h * 0.4) * pulse;
    flare.uniforms.uTime.value = t;
    flare.uniforms.uIntensity.value = 0.9 * flash * pulse;
    spark.uniforms.uIntensity.value = 1.4 * flash * pulse;
    if (glint.current) billboard(glint.current, state.camera);
    if (spot.current) spot.current.intensity = 45 * landed * (1 + h * 0.3) * pulse;
  });

  const len = BEAM_TOP;
  return (
    <group>
      <Select enabled>
        <mesh position={[0, len / 2, 0]} material={beam.material} renderOrder={3}>
          <cylinderGeometry args={[0.05, 0.17, len, 48, 1, true]} />
        </mesh>
        <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2} material={flare.material} renderOrder={3}>
          <planeGeometry args={[2.8, 2.8]} />
        </mesh>
        <mesh ref={glint} position={[0, 0.15, 0]} material={spark.material} renderOrder={4}>
          <planeGeometry args={[1.1, 1.1]} />
        </mesh>
      </Select>
      <primitive object={target} position={[0, 0, 0]} />
      <spotLight ref={spot} position={[0, BEAM_TOP, 0]} color={COLORS.beige} intensity={0} angle={0.5} penumbra={0.85} decay={2} distance={0} />
    </group>
  );
}
