"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ExitTraces } from "./AICore";
import { createCloud, createTraces } from "./coreGeometry";
import { CORE_Y, HeroMannequin } from "./HeroMannequin";
import { COLORS, beamFrag, beamVert, cloudFrag, cloudVert } from "./shaders";
import { focusPoint, hubLabelEls, motion } from "@/lib/motion";
import { Spring, lerp, range } from "@/lib/spring";
import { INTRO } from "@/lib/intro";
import { useStore } from "@/lib/store";

const blue = new THREE.Color(COLORS.signal);
const beige = new THREE.Color(COLORS.beige);

/** Base yaw: 3/4 profile facing screen-right, like the reference. Negate to face left. */
const FACING = 1.1;

/**
 * Group hierarchy — each level owns ONE kind of motion so they never fight:
 *   stage    ← route pose (lib/routes.ts, tweened on navigation) + hero composition shift
 *   approach ← intro Z travel out of the void (motion.approach, GSAP-eased)
 *     ├ orient ← 3/4 profile yaw + spring head-turn toward the cursor
 *     │   └ <HeroMannequin/>  (Bust + Dome GLTF nodes, AI core in the cavity)
 *     └ <ExitTraces/>         (screen-aligned strings running out across the page)
 *   nebula + beam (scroll zoom-out)
 */
export function HeroRig({ quality }: { quality: "high" | "low" }) {
  const traces = useMemo(createTraces, []);
  const cloudGeo = useMemo(() => createCloud(quality === "high" ? 900 : 600), [quality]); // a few motes of dust, not a starfield
  const dpr = useThree((s) => s.viewport.dpr);
  const setSceneReady = useStore((s) => s.setSceneReady);
  const frames = useRef(0);

  const stage = useRef<THREE.Group>(null);
  const approach = useRef<THREE.Group>(null);
  const orient = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const springs = useMemo(
    () => ({ turnY: new Spring(0, 40, 9), turnX: new Spring(0, 40, 9), wobble: new Spring(0, 80, 6), hover: new Spring(0, 60, 12) }),
    [],
  );
  const hoverLocal = useMemo(() => new THREE.Vector3(99, 99, 99), []);
  const hoverAmt = useRef(0);
  const hoverTarget = useRef(0);

  const uniforms = useMemo(
    () => ({
      cloud: { uTime: { value: 0 }, uBlue: { value: blue }, uBeige: { value: beige }, uCollapse: { value: 0 }, uPixelRatio: { value: dpr }, uOpacity: { value: 1 } },
      beam: { uOpacity: { value: 0 }, uBeige: { value: beige } },
    }),
    [dpr],
  );
  // Shader materials are built imperatively: passing `uniforms` as a JSX prop to
  // <shaderMaterial> left numeric uniforms frozen at their first value.
  const cloudMat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: cloudVert, fragmentShader: cloudFrag, uniforms: uniforms.cloud, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    [uniforms],
  );
  const beamMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: beamVert, fragmentShader: beamFrag, uniforms: uniforms.beam,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }),
    [uniforms],
  );

  useFrame((state, dt) => {
    // the GLB has loaded and rendered (this component suspends until then)
    if (frames.current < 3 && ++frames.current === 3) setSceneReady();
    if (process.env.NODE_ENV !== "production") (window as unknown as { __r3f: unknown }).__r3f = state; // dev inspection

    const t = state.clock.elapsedTime;
    dt = Math.min(dt, 1 / 20);
    const sg = stage.current, og = orient.current, cg = coreRef.current;
    if (!sg || !og || !cg) return;
    const st = motion.stage;
    const w = motion.homeWeight;
    const hero = motion.hero, cta = motion.cta, vel = motion.velocity;

    // stage: route pose + hero composition (bust right of the headline on desktop)
    const wide = state.size.width >= 900;
    const heroShift = wide ? 1.75 * (1 - range(hero, 0.05, 0.45)) * (1 - cta) * w : 0;
    sg.position.set(st.brainX + heroShift, st.brainY, 0);
    sg.rotation.y = st.brainRot;
    sg.scale.setScalar(st.brainScale);

    // approach: reach out of the void along Z (GSAP already applied expo.out)
    const a = motion.approach;
    if (approach.current) {
      approach.current.position.set(0, -0.5 * (1 - a), INTRO.Z_START * (1 - a));
      approach.current.rotation.x = 0.3 * (1 - a);
    }

    // orient: profile + heavy head-turn spring (scroll nudges it)
    springs.turnY.impulse(vel * 0.0004);
    og.rotation.y = FACING + springs.turnY.step(motion.pointer.x * 0.25, dt);
    og.rotation.x = springs.turnX.step(-motion.pointer.y * 0.08, dt);

    // core: expands as it is released; under-damped wobble when scroll kicks it
    springs.wobble.impulse(Math.abs(vel) * 0.0008);
    const wob = springs.wobble.step(0, dt);
    cg.scale.setScalar(lerp(0.9, 1.12, motion.split) * (1 + wob * 0.15));
    cg.rotation.y = t * 0.08; // slow orbit of the traces around the ball
    hoverAmt.current = springs.hover.step(hoverTarget.current, dt);
    // DOF focus: the split / face (core centre, nudged toward the face)
    cg.getWorldPosition(focusPoint);

    // nebula → beam on the hero zoom-out, re-forms at the CTA
    const collapse = range(hero, 0.3, 0.78) * (1 - range(cta, 0.0, 0.85)) * w;
    uniforms.cloud.uTime.value = t;
    uniforms.cloud.uCollapse.value = collapse;
    uniforms.cloud.uOpacity.value = 0.55 + collapse * 0.9;
    uniforms.beam.uOpacity.value = range(hero, 0.4, 0.8) * (1 - range(cta, 0, 0.7)) * 0.9 * w;

    // agent callouts projected from 5 hub vias on the traces
    const homeVis = range(hero, 0.04, 0.12) * (1 - range(hero, 0.3, 0.4)) * w;
    const labelVis = Math.max(homeVis, st.labels) * motion.split;
    traces.hubs.forEach((h, i) => {
      const el = hubLabelEls[i];
      if (!el) return;
      tmp.copy(h);
      cg.localToWorld(tmp);
      tmp.project(state.camera);
      const visible = labelVis > 0.01 && tmp.z < 1;
      const flick = labelVis > 0.02 && labelVis < 0.98 ? (Math.sin(t * 60 + i * 7) > 0 ? 1 : 0.3) : 1;
      el.style.opacity = visible ? String(labelVis * flick) : "0";
      el.style.transform = `translate3d(${((tmp.x + 1) / 2) * state.size.width}px, ${((1 - tmp.y) / 2) * state.size.height}px, 0)`;
    });
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!coreRef.current) return;
    hoverLocal.copy(coreRef.current.worldToLocal(e.point.clone()));
    hoverTarget.current = 1;
  };

  return (
    <group ref={stage}>
      <group ref={approach}>
        <group ref={orient}>
          <HeroMannequin coreRef={coreRef} hover={hoverLocal} hoverAmt={hoverAmt} traces={traces} particles={quality === "high" ? 512 : 256} />
          {/* invisible hover proxy over the cavity */}
          <mesh position={[0, CORE_Y, 0]} onPointerMove={onMove} onPointerOut={() => (hoverTarget.current = 0)}>
            <sphereGeometry args={[0.7, 16, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        </group>
        <group position={[0, CORE_Y, 0]}>
          <ExitTraces />
        </group>
      </group>

      <points geometry={cloudGeo} material={cloudMat} frustumCulled={false} renderOrder={1} />
      <mesh position={[0, 6.5, 0]} renderOrder={1} material={beamMat}>
        <cylinderGeometry args={[0.05, 0.42, 16, 48, 1, true]} />
      </mesh>
    </group>
  );
}
