"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Effect, EffectAttribute } from "postprocessing";
import { Uniform, Vector2, Vector3 } from "three";
import { motion } from "@/lib/motion";

/**
 * Cursor = a moving refractive lens + light source over the WebGL layer.
 * - barrel bulge around the pointer
 * - RGB split scaled by pointer speed (fluid feel)
 * - soft beige light falloff (the "magnetic light source")
 * - uDim: global scene dimming, driven by scroll choreography
 */
const frag = /* glsl */ `
  uniform vec2 uMouse;
  uniform float uAspect;
  uniform float uStrength;
  uniform float uVel;
  uniform float uDim;
  uniform vec3 uLight;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 d = uv - uMouse;
    d.x *= uAspect;
    float r = length(d);
    float radius = 0.16 + uVel * 0.05;
    float m = smoothstep(radius, 0.0, r);
    vec2 dir = r > 1e-4 ? d / r : vec2(0.0);
    vec2 off = dir * m * m * uStrength * 0.03;
    off.x /= uAspect;
    vec2 ca = dir * (0.0004 + uVel * 0.0025) * m; // a whisper of dispersion, never a rainbow ring
    ca.x /= uAspect;
    vec2 suv = uv - off;
    vec3 col;
    col.r = texture2D(inputBuffer, suv + ca).r;
    col.g = texture2D(inputBuffer, suv).g;
    col.b = texture2D(inputBuffer, suv - ca).b;
    col += uLight * pow(m, 2.5) * 0.07;
    outputColor = vec4(col * uDim, 1.0);
  }
`;

class LensImpl extends Effect {
  constructor() {
    super("LensEffect", frag, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["uMouse", new Uniform(new Vector2(-1, -1))],
        ["uAspect", new Uniform(1)],
        ["uStrength", new Uniform(1)],
        ["uVel", new Uniform(0)],
        ["uDim", new Uniform(1)],
        ["uLight", new Uniform(new Vector3(0.96, 0.96, 0.86))],
      ]),
    });
  }
}

export function LensEffect({ dim }: { dim: { current: number } }) {
  const effect = useMemo(() => new LensImpl(), []);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const u = effect.uniforms;
    const m = u.get("uMouse")!.value as Vector2;
    // damped follow for the lens itself (the DOM ring has its own spring);
    // snap on the first entry so the light doesn't streak in from off-screen
    if (Math.abs(motion.pointerUv.x - m.x) > 0.6) m.set(motion.pointerUv.x, motion.pointerUv.y);
    m.x += (motion.pointerUv.x - m.x) * 0.18;
    m.y += (motion.pointerUv.y - m.y) * 0.18;
    u.get("uAspect")!.value = size.width / size.height;
    u.get("uVel")!.value = Math.min(motion.pointerSpeed / 60, 1);
    u.get("uStrength")!.value = 1 + motion.hoverBoost * 1.5;
    u.get("uDim")!.value = dim.current;
  });
  return <primitive object={effect} dispose={null} />;
}
