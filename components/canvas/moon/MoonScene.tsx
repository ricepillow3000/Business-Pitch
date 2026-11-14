"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Cyclone } from "./Cyclone";
import { GroundDust } from "./GroundDust";
import { LightBeam } from "./LightBeam";
import { Orb } from "./Orb";
import { Rocks, Sky } from "./Sky";
import { Terrain } from "./Terrain";
import { CYCLONE_H, HOTSPOT_ANCHORS, ORB_SCALE, ORB_Y } from "./constants";
import { focusPoint, hotspotEls, motion, type HoverTarget } from "@/lib/motion";
import { Spring, range } from "@/lib/spring";
import { useStore, type PanelId } from "@/lib/store";

export type Quality = "high" | "low";

const TIERS = {
  high: { orb: 512, dust: 256, cyclone: 40000, terrain: 384 },
  low: { orb: 256, dust: 128, cyclone: 15000, terrain: 192 },
} as const;

/** Clicks that land on real controls never reach the 3D scene. */
const isControl = (e: ThreeEvent<MouseEvent | PointerEvent>) =>
  !!(e.nativeEvent.target as HTMLElement | null)?.closest?.("a, button, input, textarea, select, summary, label, [role=dialog]");

/** The orb + storm are clickable only on the home hero, after the intro, with no panel open. */
export const sceneInteractive = () => {
  const s = useStore.getState();
  return s.phase !== "loading" && !s.panel && motion.homeWeight > 0.9 && motion.hero < 0.12 && motion.reveal > 0.6;
};

/**
 * MOON SCENE — replaces the mannequin rig.
 *
 *  world  ← route pose (lib/routes.ts: subjectX/Y/Rot/Scale, tweened on navigation)
 *    ├ Terrain       alien ground displaced by terrainHeight(xz)
 *    ├ Orb           GPGPU nebula + PointLight          (bloom)
 *    ├ LightBeam     shaft + impact flare + SpotLight   (bloom)
 *    ├ GroundDust    GPGPU wind-blown dust
 *    ├ Cyclone       analytic vortex + ribbons          (bloom)
 *    ├ Rocks         drifting fragments
 *    └ click proxies (invisible) for the orb and the storm
 *  Sky              follows the camera
 */
export function MoonScene({ quality }: { quality: Quality }) {
  const tier = TIERS[quality];
  const world = useRef<THREE.Group>(null);
  const frames = useRef(0);
  const setSceneReady = useStore((s) => s.setSceneReady);
  const openPanel = useStore((s) => s.openPanel);

  const springs = useMemo(() => ({ core: new Spring(0, 60, 12), engine: new Spring(0, 60, 12) }), []);
  const hoverCore = useRef(0);
  const hoverEngine = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const anchors = useMemo(
    () => ({ core: new THREE.Vector3(...HOTSPOT_ANCHORS.core), engine: new THREE.Vector3(...HOTSPOT_ANCHORS.engine) }),
    [],
  );

  useFrame((state, delta) => {
    // everything is procedural: once three frames have rendered, the scene is ready
    if (frames.current < 3 && ++frames.current === 3) setSceneReady();
    if (process.env.NODE_ENV !== "production") (window as unknown as { __r3f: unknown }).__r3f = state; // dev inspection

    const dt = Math.min(delta, 1 / 20);
    const st = motion.stage;
    const g = world.current;
    if (!g) return;
    g.position.set(st.subjectX, st.subjectY, 0);
    g.rotation.y = st.subjectRot;
    g.scale.setScalar(st.subjectScale);
    g.updateMatrixWorld();

    // hover springs (the panel's own object stays "lit" while it is open)
    const panel = useStore.getState().panel;
    hoverCore.current = springs.core.step(motion.hover === "core" || panel === "core" ? 1 : 0, dt);
    hoverEngine.current = springs.engine.step(motion.hover === "engine" || panel === "engine" ? 1 : 0, dt);

    // DOF focus: the orb
    focusPoint.set(0, ORB_Y, 0);
    g.localToWorld(focusPoint);

    // DOM hotspots: project their anchors to screen space
    const vis = range(motion.reveal, 0.65, 1) * range(motion.homeWeight, 0.8, 1) * (1 - range(motion.hero, 0.03, 0.1)) * (panel ? 0 : 1);
    (["core", "engine"] as const).forEach((k) => {
      const el = hotspotEls[k];
      if (!el) return;
      tmp.copy(anchors[k]);
      g.localToWorld(tmp);
      tmp.project(state.camera);
      const on = vis > 0.04 && tmp.z < 1;
      el.style.opacity = on ? String(vis) : "0";
      el.style.visibility = on ? "visible" : "hidden";
      el.style.transform = `translate3d(${((tmp.x + 1) / 2) * state.size.width}px, ${((1 - tmp.y) / 2) * state.size.height}px, 0)`;
    });
  });

  const over = (k: Exclude<HoverTarget, "none">) => (e: ThreeEvent<PointerEvent>) => {
    if (isControl(e) || !sceneInteractive()) return;
    e.stopPropagation();
    motion.hover = k;
    document.body.style.cursor = "pointer";
  };
  const out = (k: Exclude<HoverTarget, "none">) => () => {
    if (motion.hover === k) motion.hover = "none";
    document.body.style.cursor = "";
  };
  const click = (k: PanelId) => (e: ThreeEvent<MouseEvent>) => {
    if (isControl(e) || !sceneInteractive()) return;
    e.stopPropagation();
    openPanel(k);
  };

  return (
    <>
      <Sky />
      <group ref={world} name="moon-world">
        <Terrain segments={tier.terrain} />
        <Orb size={tier.orb} hoverAmt={hoverCore} />
        <LightBeam hoverAmt={hoverCore} />
        <GroundDust size={tier.dust} stormAmt={hoverEngine} />
        <Cyclone count={tier.cyclone} hoverAmt={hoverEngine} />
        <Rocks />

        {/* invisible click/hover proxies (raycast targets) */}
        <mesh position={[0, ORB_Y, 0]} onPointerOver={over("core")} onPointerOut={out("core")} onClick={click("core")}>
          <sphereGeometry args={[ORB_SCALE * 1.15, 20, 14]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        <mesh position={[0, CYCLONE_H * 0.42, 0]} onPointerOver={over("engine")} onPointerOut={out("engine")} onClick={click("engine")}>
          <cylinderGeometry args={[0.7, 0.55, CYCLONE_H * 0.84, 16, 1]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>
    </>
  );
}
