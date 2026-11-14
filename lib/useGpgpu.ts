"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { GPUComputationRenderer, type Variable } from "three/examples/jsm/misc/GPUComputationRenderer.js";

/**
 * Shared GPGPU particle setup (orb nebula + ground dust).
 *
 *  Two float textures ping-ponged by GPUComputationRenderer:
 *    texturePosition  rgb = position, a = life
 *    textureVelocity  rgb = velocity, a = per-particle seed
 *  One texel = one particle. Zero CPU work per frame beyond a uniform update.
 *
 *  `init(P, V, S)` fills the initial position / velocity textures and a spawn texture
 *  (respawn targets, read by the position pass through the `uSpawn` uniform).
 */
export type GpgpuInit = (P: Float32Array, V: Float32Array, S: Float32Array, count: number) => void;

export type Gpgpu = {
  gpu: GPUComputationRenderer;
  posVar: Variable;
  velVar: Variable;
  spawn: THREE.DataTexture;
  ok: boolean;
  /** position/velocity of the current frame, for the render material */
  textures: () => { pos: THREE.Texture; vel: THREE.Texture };
};

export function useGpgpu(opts: {
  size: number;
  positionShader: string;
  velocityShader: string;
  init: GpgpuInit;
  posUniforms?: Record<string, THREE.IUniform>;
  velUniforms?: Record<string, THREE.IUniform>;
  label: string;
}): Gpgpu {
  const gl = useThree((s) => s.gl);
  const { size, positionShader, velocityShader, label } = opts;

  const sim = useMemo(() => {
    const gpu = new GPUComputationRenderer(size, size, gl);
    // Full float where the GPU can render to it; half float otherwise (older iOS)
    if (!gl.extensions.has("EXT_color_buffer_float")) gpu.setDataType(THREE.HalfFloatType);
    const pos0 = gpu.createTexture();
    const vel0 = gpu.createTexture();
    const spawn = gpu.createTexture();
    opts.init(pos0.image.data as Float32Array, vel0.image.data as Float32Array, spawn.image.data as Float32Array, size * size);
    spawn.needsUpdate = true;

    const posVar = gpu.addVariable("texturePosition", positionShader, pos0);
    const velVar = gpu.addVariable("textureVelocity", velocityShader, vel0);
    gpu.setVariableDependencies(posVar, [posVar, velVar]);
    gpu.setVariableDependencies(velVar, [posVar, velVar]);
    Object.assign(posVar.material.uniforms, { uSpawn: { value: spawn } }, opts.posUniforms);
    Object.assign(velVar.material.uniforms, opts.velUniforms);
    const err = gpu.init();
    if (err) console.error(`[${label}] GPGPU init failed:`, err);
    return {
      gpu, posVar, velVar, spawn, ok: !err,
      textures: () => ({ pos: gpu.getCurrentRenderTarget(posVar).texture, vel: gpu.getCurrentRenderTarget(velVar).texture }),
    };
    // init / uniforms are read once on creation (they're constant per size)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, size, positionShader, velocityShader, label]);

  useEffect(
    () => () => {
      sim.gpu.dispose();
      sim.spawn.dispose();
    },
    [sim],
  );
  return sim;
}

/** Point-cloud geometry whose vertices just carry a lookup uv (aRef) into the simulation textures. */
export function gpgpuPointsGeometry(size: number, bound: THREE.Sphere) {
  const count = size * size;
  const g = new THREE.BufferGeometry();
  const ref = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    ref[i * 2] = ((i % size) + 0.5) / size;
    ref[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
  }
  g.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
  // positions live in a texture; a dummy attribute satisfies three, and a fixed bound avoids culling
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.boundingSphere = bound;
  return g;
}

/** dev-only: extra simulation steps per frame (headless fast-forward). */
export function extraSimSteps() {
  if (process.env.NODE_ENV === "production") return 0;
  return (window as unknown as { __simSteps?: number }).__simSteps ?? 0;
}
