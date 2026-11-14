"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { COLORS } from "../shaders";
import { ORB_Y } from "./constants";
import { skyFrag, skyVert } from "./moonShaders";
import { mulberry32 } from "@/lib/random";

/** Night sky: dark slate zenith → hazy horizon band (matches the fog), a few faint stars. */
export function Sky() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        uniforms: {
          uZenith: { value: new THREE.Color(COLORS.zenith) },
          uHaze: { value: new THREE.Color(COLORS.haze) },
          uTime: { value: 0 },
          uStars: { value: 1 },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    mesh.current?.position.copy(state.camera.position);
  });
  return (
    <mesh ref={mesh} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[200, 48, 24]} />
    </mesh>
  );
}

const ROCKS = 16;

/** A handful of rock fragments drifting slowly around the orb, lit by it (jagged, flat-shaded). */
export function Rocks() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    const rand = mulberry32(5);
    const v = new THREE.Vector3();
    // jitter shared vertices consistently (positions are non-indexed → key by rounded coords)
    const offsets = new Map<string, number>();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
      if (!offsets.has(k)) offsets.set(k, 0.7 + rand() * 0.55);
      v.multiplyScalar(offsets.get(k)!);
      v.y *= 0.75;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5d6266", roughness: 1, flatShading: true }), []);
  const rocks = useMemo(() => {
    const rand = mulberry32(31);
    return Array.from({ length: ROCKS }, () => ({
      r: 2.2 + rand() * 4.5,
      a: rand() * Math.PI * 2,
      y: ORB_Y - 1.2 + rand() * 3.6,
      z: rand() < 0.5 ? -1 : 1,
      s: 0.035 + Math.pow(rand(), 3) * 0.2,
      w: (0.02 + rand() * 0.05) * (rand() < 0.5 ? -1 : 1),
      spin: new THREE.Vector3(rand(), rand(), rand()).multiplyScalar(0.4),
      ph: rand() * 10,
    }));
  }, []);
  const m = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const im = mesh.current;
    if (!im) return;
    rocks.forEach((k, i) => {
      const a = k.a + t * k.w;
      m.position.set(Math.cos(a) * k.r, k.y + Math.sin(t * 0.3 + k.ph) * 0.15, Math.sin(a) * k.r * 0.8 - 0.5);
      m.rotation.set(t * k.spin.x + k.ph, t * k.spin.y, t * k.spin.z);
      m.scale.setScalar(k.s);
      m.updateMatrix();
      im.setMatrixAt(i, m.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, ROCKS]} frustumCulled={false} />;
}
