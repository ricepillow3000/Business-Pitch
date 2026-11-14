"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Select } from "@react-three/postprocessing";
import { ParticleCore } from "../ParticleCore";
import { COLORS } from "../shaders";
import { ORB_SCALE, ORB_Y } from "./constants";
import { billboard, makeGlow } from "./glow";
import { motion } from "@/lib/motion";

/**
 * The orb: the GPGPU particle nebula (bloomed), a faint atmospheric haze around it
 * (deliberately subtle — no neon disc) and a real PointLight that lights the ground.
 */
export function Orb({ size, hoverAmt }: { size: number; hoverAmt: { current: number } }) {
  const light = useRef<THREE.PointLight>(null);
  const haze = useRef<THREE.Mesh>(null);
  const glow = useMemo(() => makeGlow("#cfd6e0", 4.5), []);
  const heart = useMemo(() => makeGlow("#fffbea", 14), []);
  const heartMesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const r = motion.reveal;
    const h = hoverAmt.current;
    const flicker = 1 + Math.sin(state.clock.elapsedTime * 7.3) * 0.03 + Math.sin(state.clock.elapsedTime * 2.1) * 0.04;
    if (light.current) light.current.intensity = 26 * r * (1 + h * 0.5) * flicker;
    glow.uniforms.uIntensity.value = 0.09 * r * (1 + h * 0.8);
    // the dense white-hot heart (HDR → bloom)
    heart.uniforms.uIntensity.value = 2.6 * r * (1 + h * 0.6) * flicker;
    if (heartMesh.current) billboard(heartMesh.current, state.camera);
    if (haze.current) billboard(haze.current, state.camera);
  });

  return (
    <group position={[0, ORB_Y, 0]}>
      <Select enabled>
        <group scale={ORB_SCALE}>
          <ParticleCore size={size} hoverAmt={hoverAmt} />
        </group>
        <mesh ref={heartMesh} material={heart.material} renderOrder={6}>
          <planeGeometry args={[1.1, 1.1]} />
        </mesh>
      </Select>
      <mesh ref={haze} material={glow.material} renderOrder={2}>
        <planeGeometry args={[5, 5]} />
      </mesh>
      <pointLight ref={light} color={COLORS.beige} intensity={0} distance={0} decay={2} />
    </group>
  );
}
