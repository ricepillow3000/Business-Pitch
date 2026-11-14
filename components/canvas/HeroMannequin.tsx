"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AICore } from "./AICore";
import { createTraces } from "./coreGeometry";
import { CUT } from "./mannequinGeometry";
import { COLORS } from "./shaders";
import { motion } from "@/lib/motion";

export const MODEL_URL = "/models/mannequin.glb";
/** Core centre in head space: in the cavity, just above the cut. */
export const CORE_Y = CUT + 0.33;
/** Dome lift (head units) + small backward tilt at full open. */
const LIFT = 0.95;
const TILT = -0.12;

type MannequinGLTF = GLTF & { nodes: { Bust: THREE.Mesh; Dome: THREE.Mesh } };

/**
 * UNGLAZED PORCELAIN — MeshPhysicalMaterial tuned away from "plastic game":
 *  • roughness 0.58 / metalness 0  → bisque-matte, broad soft highlights
 *  • ior 1.5 + specularIntensity 0.55 → physically correct (dielectric) Fresnel:
 *    edges brighten at grazing angles, the face stays matte
 *  • clearcoat 0.06 (rough 0.45) → the faintest satin film, never glossy
 *  • sheen 0.3 (white, rough 0.85) → micro-fuzz of unglazed ceramic catching the rim light
 *  • subsurface scattering (three.js has none built in) → fast translucency term
 *    (Barré-Brisebois): core light transmitted THROUGH the thin wall toward the eye,
 *    so the head glows faintly from within before it opens.
 * The skull is a closed solid (outer wall, inner wall, flat lip on the cut), so
 * FrontSide is enough and the inside is lit by REAL light: the core's point lights.
 */
function createShell(shared: Record<string, { value: unknown }>, cutY: number) {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#f3f2ee", // neutral porcelain white
    roughness: 0.58,
    metalness: 0,
    ior: 1.5,
    specularIntensity: 0.55,
    specularColor: new THREE.Color("#ffffff"),
    clearcoat: 0.06,
    clearcoatRoughness: 0.45,
    sheen: 0.3,
    sheenColor: new THREE.Color("#ffffff"),
    sheenRoughness: 0.85,
    envMapIntensity: 0.9,
    side: THREE.FrontSide,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, { uCutY: { value: cutY } });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;\nvarying float vObjY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjY = transformed.y;\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vWorldPos; varying float vObjY;
        uniform vec3 uCorePos; uniform vec3 uCoreColor; uniform float uSSS;
        uniform float uCrack; uniform float uSplit; uniform float uCutY; uniform vec3 uBeige;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        vec3 Nw = inverseTransformDirection(normal, viewMatrix);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 toCore = uCorePos - vWorldPos;
        vec3 Lc = normalize(toCore);
        // translucency: core light transmitted through the shell toward the viewer
        vec3 Ht = normalize(Lc + Nw * 0.45);
        float trans = pow(clamp(dot(V, -Ht), 0.0, 1.0), 2.5);
        float falloff = 1.0 / (1.0 + dot(toCore, toCore) * 1.4);
        totalEmissiveRadiance += uCoreColor * trans * falloff * uSSS;
        // hairline of light leaking through the cut just before the dome lifts
        totalEmissiveRadiance += uBeige * exp(-abs(vObjY - uCutY) * 90.0) * uCrack * 2.0 * (1.0 - uSplit);`,
      );
  };
  m.customProgramCacheKey = () => `ceramic-shell-${cutY}`;
  return m;
}

type Props = {
  coreRef: React.RefObject<THREE.Group | null>;
  hover: THREE.Vector3;
  hoverAmt: { current: number };
  traces: ReturnType<typeof createTraces>;
};

/**
 * <HeroMannequin/> — GLTF nodes "Bust" + "Dome", matte white shell, AI core inside.
 * The split: GSAP (Preloader master timeline) tweens motion.split 0→1 with its ease;
 * here that value becomes the Dome node's Y translation (+ a small tilt).
 */
export function HeroMannequin({ coreRef, hover, hoverAmt, traces }: Props) {
  const { nodes } = useGLTF(MODEL_URL, false, false) as unknown as MannequinGLTF;
  const dome = useRef<THREE.Mesh>(null);
  const beigeLight = useRef<THREE.PointLight>(null);
  const blueLight = useRef<THREE.PointLight>(null);

  const shared = useMemo(
    () => ({
      uCorePos: { value: new THREE.Vector3() },
      uCoreColor: { value: new THREE.Color(COLORS.beige).lerp(new THREE.Color(COLORS.signal), 0.35) },
      uSSS: { value: 0 },
      uCrack: { value: 0 },
      uSplit: { value: 0 },
      uBeige: { value: new THREE.Color(COLORS.beige) },
    }),
    [],
  );
  const bustMat = useMemo(() => createShell(shared, 0 + CUT), [shared]); // Bust node: cut at y = CUT
  const domeMat = useMemo(() => createShell(shared, 0), [shared]); // Dome node origin is ON the cut

  useFrame(() => {
    const s = motion.split;
    // ── THE SPLIT: dome node lifts along Y (GSAP owns the easing via motion.split) ──
    if (dome.current) {
      dome.current.position.set(nodes.Dome.position.x, nodes.Dome.position.y + LIFT * s, nodes.Dome.position.z - 0.08 * s);
      dome.current.rotation.x = TILT * s;
    }
    shared.uSplit.value = s;
    shared.uCrack.value = motion.crack;
    shared.uSSS.value = 0.12 + motion.crack * 0.3 + s * 0.2; // faint inner glow through the porcelain
    if (coreRef.current) coreRef.current.getWorldPosition(shared.uCorePos.value);
    // REAL bounce: the core's light falls on the matte white interior of the skull + dome underside
    const glow = 0.15 + motion.crack * 0.4 + s * 1.0;
    if (beigeLight.current) beigeLight.current.intensity = glow * 6;
    if (blueLight.current) blueLight.current.intensity = glow * 4;
  });

  return (
    <group>
      <mesh geometry={nodes.Bust.geometry} material={bustMat} position={nodes.Bust.position} />
      <mesh ref={dome} geometry={nodes.Dome.geometry} material={domeMat} position={nodes.Dome.position} />
      <group position={[0, CORE_Y, 0]}>
        <AICore ref={coreRef} hover={hover} hoverAmt={hoverAmt} traces={traces} />
        <pointLight ref={beigeLight} color={COLORS.beige} intensity={0} distance={3} decay={2} position={[0, 0.05, 0.1]} />
        <pointLight ref={blueLight} color={COLORS.signal} intensity={0} distance={2.6} decay={2} position={[0, -0.05, -0.2]} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL, false, false);
