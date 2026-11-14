"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";
import { createBrainGeometry, createCloud, createPathways } from "./brainGeometry";
import {
  COLORS,
  beamFrag,
  beamVert,
  cloudFrag,
  cloudVert,
  nodeFrag,
  nodeVert,
  pathwayFrag,
  pathwayVert,
  shellFrag,
  shellVert,
} from "./shaders";
import { hubLabelEls, motion } from "@/lib/motion";
import { Spring, range } from "@/lib/spring";

const blue = new THREE.Color(COLORS.signal);
const beige = new THREE.Color(COLORS.beige);

export function Brain({ quality }: { quality: "high" | "low" }) {
  const { merged, cerebrum } = useMemo(createBrainGeometry, []);
  const { pathways, nodeGeo, hubs } = useMemo(() => createPathways(cerebrum), [cerebrum]);
  const cloudGeo = useMemo(() => createCloud(quality === "high" ? 4200 : 2200), [quality]);
  const dpr = useThree((s) => s.viewport.dpr);

  const stageGroup = useRef<THREE.Group>(null); // route-driven pose (lib/routes.ts)
  const group = useRef<THREE.Group>(null); // physics (springs)
  const tmp = useMemo(() => new THREE.Vector3(), []);

  // Springs = physical response. Rotation follows pointer with overshoot; scroll kicks it.
  const springs = useMemo(
    () => ({ rx: new Spring(0, 70, 9), ry: new Spring(0, 70, 9), squash: new Spring(1, 180, 10), hover: new Spring(0, 60, 12) }),
    [],
  );
  const hoverLocal = useMemo(() => new THREE.Vector3(9, 9, 9), []);
  const hoverTarget = useRef(0);
  const idle = useRef(0);

  const uniforms = useMemo(() => {
    const shared = { uTime: { value: 0 }, uBlue: { value: blue }, uBeige: { value: beige } };
    return {
      pathway: { ...shared, uActivity: { value: 0.4 }, uHover: { value: hoverLocal }, uHoverAmt: { value: 0 }, uFocusHub: { value: -1 } },
      node: { ...shared, uPixelRatio: { value: dpr }, uActivity: { value: 0.4 } },
      shell: { ...shared, uIntensity: { value: 1 }, uHover: { value: hoverLocal }, uHoverAmt: { value: 0 } },
      cloud: { ...shared, uCollapse: { value: 0 }, uPixelRatio: { value: dpr }, uOpacity: { value: 1 } },
      beam: { uOpacity: { value: 0 }, uBeige: { value: beige } },
    };
  }, [dpr, hoverLocal]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    dt = Math.min(dt, 1 / 20);
    const g = group.current;
    const sg = stageGroup.current;
    if (!g || !sg) return;
    const st = motion.stage;
    const w = motion.homeWeight;
    sg.position.set(st.brainX, st.brainY, 0);
    sg.rotation.y = st.brainRot;
    sg.scale.setScalar(st.brainScale);

    const hero = motion.hero;
    const cta = motion.cta;
    const vel = motion.velocity;

    // ── spring physics ───────────────────────────────────────────
    idle.current += dt * 0.07;
    springs.ry.impulse(vel * 0.0009); // scroll flicks the brain
    const ry = springs.ry.step(-1.15 + idle.current + motion.pointer.x * 0.55, dt);
    const rx = springs.rx.step(motion.pointer.y * -0.28 + 0.08, dt);
    const sq = springs.squash.step(1 + Math.min(Math.abs(vel) * 0.004, 0.12), dt);
    const hv = springs.hover.step(hoverTarget.current, dt);
    g.rotation.set(rx, ry, 0);
    g.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); // volume-preserving squash
    g.position.y = Math.sin(t * 0.6) * 0.03;

    // ── uniforms ─────────────────────────────────────────────────
    const activity = 0.35 + st.activity * (1 - w) + Math.min(Math.abs(vel) * 0.012, 1.2) + hv * 0.8 + motion.hoverBoost * 0.6 + cta * 0.8;
    for (const u of [uniforms.pathway, uniforms.node, uniforms.shell, uniforms.cloud]) u.uTime.value = t;
    uniforms.pathway.uActivity.value = activity;
    uniforms.node.uActivity.value = activity;
    uniforms.pathway.uHoverAmt.value = hv;
    uniforms.shell.uHoverAmt.value = hv;

    // cloud collapses into beam as the hero zooms out, re-forms at the CTA
    const collapse = range(hero, 0.3, 0.78) * (1 - range(cta, 0.0, 0.85)) * w;
    uniforms.cloud.uCollapse.value = collapse;
    uniforms.cloud.uOpacity.value = 0.55 + collapse * 0.9;
    uniforms.beam.uOpacity.value = range(hero, 0.4, 0.8) * (1 - range(cta, 0, 0.7)) * 0.9 * w;

    // agent hub callouts: flicker on early in the home hero, or held on by a route preset
    const homeVis = range(hero, 0.04, 0.12) * (1 - range(hero, 0.3, 0.4)) * w;
    const labelVis = Math.max(homeVis, st.labels);
    const size = state.size;
    hubs.forEach((h, i) => {
      const el = hubLabelEls[i];
      if (!el) return;
      tmp.copy(h);
      g.localToWorld(tmp);
      tmp.project(state.camera);
      const visible = labelVis > 0.01 && tmp.z < 1;
      const flick = labelVis > 0.02 && labelVis < 0.98 ? (Math.sin(t * 60 + i * 7) > 0 ? 1 : 0.3) : 1;
      el.style.opacity = visible ? String(labelVis * flick) : "0";
      el.style.transform = `translate3d(${((tmp.x + 1) / 2) * size.width}px, ${((1 - tmp.y) / 2) * size.height}px, 0)`;
    });
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!group.current) return;
    hoverLocal.copy(group.current.worldToLocal(e.point.clone()));
    hoverTarget.current = 1;
  };

  return (
    <group ref={stageGroup}>
      <group ref={group}>
        {/* Glass body */}
        <mesh geometry={merged} onPointerMove={onMove} onPointerOut={() => (hoverTarget.current = 0)}>
          {quality === "high" ? (
            <MeshTransmissionMaterial
              samples={6}
              resolution={768}
              transmission={1}
              thickness={0.55}
              roughness={0.12}
              ior={1.32}
              chromaticAberration={0.08}
              anisotropicBlur={0.15}
              distortion={0.35}
              distortionScale={0.4}
              temporalDistortion={0.08}
              clearcoat={1}
              clearcoatRoughness={0.1}
              color={"#e9ecd8"}
              attenuationColor={COLORS.signal}
              attenuationDistance={2.4}
              envMapIntensity={1.2}
              background={new THREE.Color(COLORS.void)}
            />
          ) : (
            <meshPhysicalMaterial
              transmission={1}
              thickness={0.5}
              roughness={0.15}
              ior={1.3}
              color={"#e9ecd8"}
              attenuationColor={COLORS.signal}
              attenuationDistance={2.4}
              transparent
            />
          )}
        </mesh>

        {/* Holographic rim + scanlines */}
        <mesh geometry={merged} scale={1.004} renderOrder={2}>
          <shaderMaterial
            vertexShader={shellVert}
            fragmentShader={shellFrag}
            uniforms={uniforms.shell}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Neural pathways — agent workflows */}
        <mesh geometry={pathways} renderOrder={3}>
          <shaderMaterial
            vertexShader={pathwayVert}
            fragmentShader={pathwayFrag}
            uniforms={uniforms.pathway}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Synapse nodes */}
        <points geometry={nodeGeo} renderOrder={4}>
          <shaderMaterial
            vertexShader={nodeVert}
            fragmentShader={nodeFrag}
            uniforms={uniforms.node}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

      </group>

      {/* Nebula → beam */}
      <points geometry={cloudGeo} frustumCulled={false} renderOrder={1}>
        <shaderMaterial
          vertexShader={cloudVert}
          fragmentShader={cloudFrag}
          uniforms={uniforms.cloud}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <mesh position={[0, 6.5, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.05, 0.42, 16, 48, 1, true]} />
        <shaderMaterial
          vertexShader={beamVert}
          fragmentShader={beamFrag}
          uniforms={uniforms.beam}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
