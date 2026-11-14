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

/* ═══ BALL OF LIGHT — raymarched volumetric core ═══════════════════════
 * Rendered on a bounding sphere. Each fragment marches the view ray through
 * the sphere, integrating a soft Gaussian density modulated by animated fbm.
 * Emission: beige-hot centre → Flag-Blue edge. Additive + toneMapped:false,
 * so the centre exceeds 1.0 and only it feeds the selective bloom. */
export const volumeVert = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const volumeFrag = /* glsl */ `
  uniform vec3 uCamLocal;   // camera position in the sphere's object space
  uniform float uRadius;
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uHot;        // beige (HDR)
  uniform vec3 uEdge;       // flag blue (HDR)
  varying vec3 vLocal;

  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

  void main() {
    vec3 ro = uCamLocal;
    vec3 rd = normalize(vLocal - uCamLocal);
    float b = dot(ro, rd);
    float c = dot(ro, ro) - uRadius * uRadius;
    float h = b * b - c;
    if (h < 0.0) discard;
    h = sqrt(h);
    float t0 = max(-b - h, 0.0), t1 = -b + h;
    const int STEPS = 28;
    float dt = (t1 - t0) / float(STEPS);
    vec3 acc = vec3(0.0);
    float trans = 1.0;
    for (int i = 0; i < STEPS; i++) {
      vec3 p = ro + rd * (t0 + (float(i) + 0.5) * dt);
      float r = length(p) / uRadius;
      float n = fbm(p * 5.0 + vec3(0.0, uTime * 0.35, uTime * 0.12));
      float dens = exp(-r * r * 7.0) * (0.7 + 0.6 * n) + 0.12 * exp(-r * r * 2.2) * n;
      vec3 col = mix(uHot, uEdge, smoothstep(0.05, 0.75, r));
      acc += col * dens * trans * dt * 9.0;
      trans *= exp(-dens * dt * 1.2);
    }
    gl_FragColor = vec4(acc * uIntensity, 1.0);
  }
`;

/* ═══ STRINGS OF LIGHT — LineBasicMaterial, extended ═══════════════════
 * Keeps three's LineBasicMaterial (fog, clipping, program cache) and patches:
 *  - per-vertex aProgress / aSeed attributes
 *  - draw-on: segments beyond uReveal are not drawn (strings grow out of the core)
 *  - travelling pulses (data packets) + a white-hot spark on the growing tip
 *  - HDR colour (toneMapped:false) so the selective bloom turns 1px lines into fibre-optics */
export function patchStringMaterial(m: import("three").LineBasicMaterial, uniforms: Record<string, { value: unknown }>) {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aProgress;\nattribute float aSeed;\nvarying float vProgress;\nvarying float vSeed;\nvarying vec3 vLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvProgress = aProgress;\nvSeed = aSeed;\nvLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime; uniform float uReveal; uniform float uActivity; uniform float uBase;
        uniform vec3 uBlue; uniform vec3 uBeige; uniform vec3 uHover; uniform float uHoverAmt;
        varying float vProgress; varying float vSeed; varying vec3 vLocal;`,
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `float speed = 0.18 + vSeed * 0.3;
        float head = fract(uTime * speed * (0.6 + uActivity) + vSeed * 17.0);
        float d = head - vProgress;
        float pulse = smoothstep(0.14, 0.0, d) * step(0.0, d) + smoothstep(0.015, 0.0, abs(d)) * 2.0;
        float drawn = 1.0 - smoothstep(uReveal - 0.015, uReveal, vProgress);
        float hover = uHoverAmt * smoothstep(0.4, 0.0, distance(vLocal, uHover));
        vec3 tint = vSeed > 0.5 ? uBeige : uBlue;
        vec3 col = tint * (uBase + pulse * (1.2 + uActivity) + hover * 1.5);
        col += uBeige * smoothstep(0.025, 0.0, abs(vProgress - uReveal)) * 3.0 * step(uReveal, 0.999);
        vec4 diffuseColor = vec4(col * drawn, opacity);`,
      );
  };
  m.customProgramCacheKey = () => "strings-of-light";
}
