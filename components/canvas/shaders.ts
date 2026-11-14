/* GLSL kept as TS strings → no bundler loader config needed. */

export const COLORS = {
  void: "#152626",
  slate: "#2f4f4f",
  signal: "#6e9bf0",
  flag: "#0a3161",
  beige: "#f5f5dc",
};

/* ── Nebula → beam (mirrors the reference's cloud collapsing into a light shaft) ── */
export const cloudVert = /* glsl */ `
  attribute vec3 aBeam;
  attribute float aSeed;
  uniform float uTime;
  uniform float uCollapse;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    // slow orbit
    float a = uTime * (0.02 + aSeed * 0.04);
    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec3 p = position;
    p.xz = rot * p.xz;
    p.y += sin(uTime * 0.3 + aSeed * 20.0) * 0.06;

    // staggered collapse: each particle has its own delay
    float t = clamp(uCollapse * 1.6 - aSeed * 0.6, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 b = aBeam;
    b.y += fract(uTime * 0.05 * (0.5 + aSeed)) * 2.0; // upward flow in the beam
    p = mix(p, b, t);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (1.0 + aSeed * 2.4) * 18.0 * uPixelRatio / -mv.z;
    vAlpha = (0.25 + aSeed * 0.75) * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 60.0));
    gl_Position = projectionMatrix * mv;
  }
`;

export const cloudFrag = /* glsl */ `
  uniform vec3 uBlue;
  uniform vec3 uBeige;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float s = smoothstep(0.5, 0.0, d);
    vec3 col = mix(uBlue, uBeige, vAlpha);
    gl_FragColor = vec4(col * s * s * vAlpha * uOpacity * 0.6, 1.0);
  }
`;

/* ── Light beam ── */
export const beamVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    vY = uv.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const beamFrag = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uBeige;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    float core = pow(abs(dot(normalize(vN), normalize(vV))), 3.0);
    float fade = smoothstep(0.0, 0.15, vY) * smoothstep(1.0, 0.35, vY);
    gl_FragColor = vec4(uBeige * core * fade * uOpacity, 1.0);
  }
`;

/* ── Backdrop: Dark Slate Gray radial "void" ── */
export const backdropVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

export const backdropFrag = /* glsl */ `
  uniform vec3 uVoid;
  uniform vec3 uSlate;
  uniform float uAspect;
  uniform float uGlow;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - vec2(0.5, 0.56);
    p.x *= uAspect;
    float r = length(p);
    vec3 col = mix(uSlate * (0.75 + 0.25 * uGlow), uVoid, smoothstep(0.0, 0.95, r));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ═══ STRINGS OF LIGHT — LineBasicMaterial, extended ═══════════════════
 * Keeps three's LineBasicMaterial (fog, clipping, program cache) and patches:
 *  - per-vertex aProgress / aSeed attributes
 *  - draw-on by aRadial: strings grow outward from the particle nebula as uReveal rises
 *  - travelling pulses (data packets) + a white-hot spark on the growing tip
 *  - HDR colour (toneMapped:false) so the selective bloom turns 1px lines into fibre-optics */
export function patchStringMaterial(m: import("three").LineBasicMaterial, uniforms: Record<string, { value: unknown }>) {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aProgress;\nattribute float aSeed;\nattribute float aRadial;\nvarying float vProgress;\nvarying float vSeed;\nvarying float vRadial;\nvarying vec3 vLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvProgress = aProgress;\nvSeed = aSeed;\nvRadial = aRadial;\nvLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime; uniform float uReveal; uniform float uActivity; uniform float uBase;
        uniform vec3 uBlue; uniform vec3 uBeige; uniform vec3 uHover; uniform float uHoverAmt;
        varying float vProgress; varying float vSeed; varying float vRadial; varying vec3 vLocal;`,
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `float speed = 0.18 + vSeed * 0.3;
        float head = fract(uTime * speed * (0.6 + uActivity) + vSeed * 17.0);
        float d = head - vProgress;
        float pulse = smoothstep(0.14, 0.0, d) * step(0.0, d) + smoothstep(0.015, 0.0, abs(d)) * 2.0;
        float drawn = 1.0 - smoothstep(uReveal - 0.015, uReveal, vRadial);
        float hover = uHoverAmt * smoothstep(0.4, 0.0, distance(vLocal, uHover));
        vec3 tint = vSeed > 0.5 ? uBeige : uBlue;
        vec3 col = tint * (uBase + pulse * (1.2 + uActivity) + hover * 1.5);
        col += uBeige * smoothstep(0.025, 0.0, abs(vRadial - uReveal)) * 3.0 * step(uReveal, 0.999);
        vec4 diffuseColor = vec4(col * drawn, opacity);`,
      );
  };
  m.customProgramCacheKey = () => "strings-of-light";
}
