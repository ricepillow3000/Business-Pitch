"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { COLORS } from "../shaders";
import {
  terrainColorChunk, terrainEmissiveChunk, terrainFragPars, terrainNormalChunk, terrainVertBegin, terrainVertPars,
} from "./moonShaders";
import { motion } from "@/lib/motion";

/**
 * The alien ground. One big plane displaced on the GPU by terrainHeight(xz):
 * pale dusty valley floor where the beam lands, rugged ridges left/right, a far
 * back wall, craters. MeshStandardMaterial (rough regolith, real lighting from the
 * orb + beam) patched with per-pixel normals, an impact glow and wind streaks.
 */
export function Terrain({ segments }: { segments: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(170, 170, segments, segments);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -45); // most of the ground lies ahead of the camera
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -45), 130);
    return g;
  }, [segments]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uWind: { value: 1 },
      uWorldRot: { value: new THREE.Matrix3() },
      uBeige: { value: new THREE.Color(COLORS.beige) },
    }),
    [],
  );

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: COLORS.regolith, roughness: 0.96, metalness: 0, envMapIntensity: 0.5 });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${terrainVertPars}`)
        .replace("#include <begin_vertex>", terrainVertBegin);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${terrainFragPars}`)
        .replace("#include <normal_fragment_begin>", terrainNormalChunk)
        .replace("#include <color_fragment>", terrainColorChunk)
        .replace("#include <emissivemap_fragment>", terrainEmissiveChunk);
    };
    m.customProgramCacheKey = () => "moon-terrain";
    return m;
  }, [uniforms]);

  const m4 = useMemo(() => new THREE.Matrix4(), []);
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uReveal.value = motion.reveal;
    uniforms.uWind.value = 1 + motion.stage.activity;
    if (mesh.current) {
      m4.extractRotation(mesh.current.matrixWorld);
      uniforms.uWorldRot.value.setFromMatrix4(m4);
    }
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={0} />;
}
