import * as THREE from "three";
import { glowFrag, glowVert } from "./moonShaders";

/** Additive soft radial glow (built imperatively: JSX uniforms would freeze — HANDOFF gotcha 1). */
export function makeGlow(color: THREE.ColorRepresentation, falloff: number, rays = 0) {
  const uniforms = {
    uColor: { value: new THREE.Color(color) },
    uIntensity: { value: 0 },
    uFalloff: { value: falloff },
    uTime: { value: 0 },
    uRays: { value: rays },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: glowVert, fragmentShader: glowFrag, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
  });
  return { uniforms, material };
}

const _q = new THREE.Quaternion();
/** Face a mesh to the camera even when its parents are rotated. */
export function billboard(obj: THREE.Object3D, camera: THREE.Camera) {
  if (!obj.parent) return;
  obj.parent.getWorldQuaternion(_q);
  obj.quaternion.copy(_q.invert()).multiply(camera.quaternion);
}
