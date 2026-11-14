/* ════════════════════════════════════════════════════════════════════
   MOON SCENE — shared GLSL
   terrainHeight(xz) is the SINGLE SOURCE OF TRUTH for the ground: the terrain
   mesh, the ground-dust simulation and the impact effects all call it, so dust
   hugs the exact surface you see.
   ════════════════════════════════════════════════════════════════════ */
import { SIMPLEX } from "../nebulaShaders";

export const NOISE2D = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y) * 2.0 - 1.0;
}
const mat2 FBM_ROT = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = FBM_ROT * p; a *= 0.5; } return s; }
float ridgedFbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { float n = 1.0 - abs(vnoise(p)); s += a * n * n; p = FBM_ROT * p; a *= 0.5; } return s; }
`;

/**
 * Terrain: a pale valley floor around the impact, rugged ridges rising left/right
 * (like the reference), a far back wall, and craters (bowl + raised rim) on a
 * jittered grid — none near the beam so the impact reads cleanly.
 */
export const TERRAIN = /* glsl */ `
${NOISE2D}
float craterField(vec2 p){
  const float CELL = 7.0;
  vec2 base = floor(p / CELL - 0.5);
  float h = 0.0;
  for (int j = 0; j <= 1; j++) for (int i = 0; i <= 1; i++) {
    vec2 c = base + vec2(float(i), float(j));
    vec2 centre = (c + 0.2 + hash22(c) * 0.6) * CELL;
    float rad = mix(0.8, 2.8, hash12(c + 17.0));
    float on = step(0.35, hash12(c + 3.1));
    float d = length(p - centre) / rad;
    float bowl = -(1.0 - d * d) * step(d, 1.0);
    float rim = exp(-pow((d - 1.0) / 0.28, 2.0)) * 0.45;
    h += (bowl + rim) * rad * 0.22 * on;
  }
  return h;
}
float terrainHeight(vec2 p){
  float r = length(p);
  float valley = smoothstep(1.5, 11.0, r);
  float h = fbm(p * 0.11) * 1.1 * valley + fbm(p * 0.55 + 4.0) * 0.12 * (0.25 + valley);
  // side ridges (wavy axis so the valley meanders)
  float side = abs(p.x + fbm(p * 0.045 + 3.0) * 5.0);
  h += smoothstep(4.5, 17.0, side) * (3.5 + 7.0 * ridgedFbm(p * 0.07)) + smoothstep(14.0, 40.0, side) * 6.0 * ridgedFbm(p * 0.03 + 2.0);
  // far back wall
  h += smoothstep(-16.0, -70.0, p.y) * (5.0 + 9.0 * ridgedFbm(p * 0.035 + 7.0));
  h += craterField(p) * smoothstep(2.5, 6.0, r);
  return h;
}
vec3 terrainNormal(vec2 p, float e){
  float h = terrainHeight(p);
  float hx = terrainHeight(p + vec2(e, 0.0));
  float hz = terrainHeight(p + vec2(0.0, e));
  return normalize(vec3(h - hx, e, h - hz));
}
`;

/* ── Terrain: MeshStandardMaterial patch (onBeforeCompile) ───────────────────── */
export const terrainVertPars = /* glsl */ `
${TERRAIN}
varying vec2 vXZ;
`;
export const terrainVertBegin = /* glsl */ `
vXZ = position.xz;
vec3 transformed = vec3(position.x, terrainHeight(position.xz), position.z);
`;
export const terrainFragPars = /* glsl */ `
${TERRAIN}
uniform float uTime;
uniform float uReveal;
uniform float uWind;
uniform mat3 uWorldRot;
uniform vec3 uBeige;
varying vec2 vXZ;
`;
/** per-pixel normal (detail the mesh can't carry); epsilon grows with distance → no shimmer */
export const terrainNormalChunk = /* glsl */ `
#include <normal_fragment_begin>
{
  float e = clamp(-vViewPosition.z * 0.004, 0.035, 0.6);
  vec3 nLocal = terrainNormal(vXZ, e);
  normal = normalize((viewMatrix * vec4(uWorldRot * nLocal, 0.0)).xyz);
  nonPerturbedNormal = normal;
}
`;
/** regolith albedo: pale dusty floor near the impact, darker rock on the ridges */
export const terrainColorChunk = /* glsl */ `
#include <color_fragment>
{
  float r = length(vXZ);
  float hgt = terrainHeight(vXZ);
  float floorMask = (1.0 - smoothstep(0.6, 4.0, hgt)) * (0.55 + 0.45 * exp(-r * 0.05));
  float grit = 0.85 + 0.3 * vnoise(vXZ * 3.1) * vnoise(vXZ * 0.7 + 9.0);
  // scattered dark pebbles on the floor (like the reference)
  vec2 pc = floor(vXZ * 5.0);
  vec2 po = hash22(pc) - 0.5;
  float pebble = step(0.86, hash12(pc + 5.3)) * smoothstep(0.16, 0.06, length(fract(vXZ * 5.0) - 0.5 - po * 0.5));
  diffuseColor.rgb *= mix(0.5, 1.2, floorMask) * grit * (1.0 - pebble * 0.6 * floorMask);
}
`;
/**
 * Emissive additions: the impact glow where the beam lands, a shock ring that
 * expands during the reveal, and radial WIND STREAKS rippling outward — the ground
 * reads as being blasted by a gust from the beam.
 */
export const terrainEmissiveChunk = /* glsl */ `
#include <emissivemap_fragment>
{
  float r = length(vXZ);
  float a = atan(vXZ.y, vXZ.x);
  float strike = smoothstep(0.15, 0.45, uReveal);
  // impact glow
  totalEmissiveRadiance += uBeige * (exp(-r * r * 2.2) * 1.0 + exp(-r * 1.1) * 0.06) * strike;
  // shock ring racing out as the scene reveals
  float ringR = uReveal * 16.0;
  totalEmissiveRadiance += uBeige * exp(-pow((r - ringR) / 0.6, 2.0)) * 0.22 * strike * (1.0 - uReveal);
  // radial wind streaks: long along the radius, thin across it, scrolling outward
  float s = vnoise(vec2(a * 22.0, r * 0.32 - uTime * 1.25)) * 0.5 + 0.5;
  s *= vnoise(vec2(a * 9.0 + 3.0, r * 0.15 - uTime * 0.6)) * 0.5 + 0.5;
  float streak = smoothstep(0.3, 0.7, s) * smoothstep(0.6, 2.5, r) * exp(-r * 0.16);
  totalEmissiveRadiance += uBeige * streak * 0.08 * uWind * strike;
}
`;

/* ── Light beam (orb → ground) ─────────────────────────────────────────────── */
export const beamVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
export const beamFrag = /* glsl */ `
${NOISE2D}
uniform float uTime;
uniform float uStrike;   // 0 → 1: the beam extends from the orb down to the ground
uniform float uIntensity;
uniform vec3 uBeige;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
void main() {
  float core = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
  float y = vUv.y; // 1 at the orb, 0 at the ground
  float flow = vnoise(vec2(vUv.x * 10.0, y * 5.0 + uTime * 2.6)) * 0.5 + 0.5;
  flow = 0.65 + 0.7 * flow * flow;
  float fade = smoothstep(1.0, 0.86, y) * (0.55 + 0.45 * smoothstep(0.0, 0.25, y));
  float vis = smoothstep(1.0 - uStrike - 0.04, 1.0 - uStrike, y);
  float head = exp(-pow((y - (1.0 - uStrike)) / 0.04, 2.0)) * step(uStrike, 0.995) * 2.0;
  gl_FragColor = vec4(uBeige * (core * flow * fade * vis + head * core) * uIntensity, 1.0);
}
`;

/* ── Soft radial glow (impact flare disc, billboards, orb haze) ─────────────── */
export const glowVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const glowFrag = /* glsl */ `
${NOISE2D}
uniform vec3 uColor;
uniform float uIntensity;
uniform float uFalloff;
uniform float uTime;
uniform float uRays;      // >0 adds faint radial rays (impact flare)
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float g = exp(-r * r * uFalloff) * (1.0 - smoothstep(0.85, 1.0, r));
  float a = atan(p.y, p.x);
  float rays = 1.0 + uRays * (vnoise(vec2(a * 14.0, uTime * 0.8)) * 0.5 + 0.5) * smoothstep(0.05, 0.5, r);
  gl_FragColor = vec4(uColor * g * rays * uIntensity, 1.0);
}
`;

/* ── Ground dust (GPGPU) ───────────────────────────────────────────────────── */
/**
 * VELOCITY: radial outflow from the impact (wind speed ∝ 1/(1+r)), gust pulses that
 * travel outward as waves, a swirl near the beam that feeds the cyclone, a lift
 * near the impact (dust is kicked up) and a pull back to the surface farther out
 * (it settles). Curl noise breaks it into eddies.
 */
export const dustVelocityShader = /* glsl */ `
${SIMPLEX}
${TERRAIN}
uniform float uTime;
uniform float uDt;
uniform float uReveal;
uniform float uGust;
uniform float uStorm;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  vec3 pos = p.xyz;
  float seed = v.w;
  vec2 xz = pos.xz;
  float r = length(xz) + 1e-4;
  vec2 dir = xz / r;

  float wave = pow(0.5 + 0.5 * sin(uTime * 1.3 - r * 0.55 + seed * 0.8), 6.0);
  float wind = (3.0 / (1.0 + r * 0.22)) * (0.45 + 0.9 * wave + uGust) * uReveal;
  vec3 target = vec3(dir.x * wind, 0.0, dir.y * wind);
  vec2 tang = vec2(-dir.y, dir.x);
  target.xz += tang * (1.2 + uStorm) * exp(-r * 0.55) * uReveal;

  float alt = pos.y - terrainHeight(xz);
  target.y = (2.0 + uGust) * exp(-r * 0.8) * uReveal * (0.4 + seed) - alt * (0.6 + 0.5 * seed);
  target += curlNoise(pos * 0.32 + vec3(0.0, 0.0, uTime * 0.08)) * (0.35 + 0.4 * wave);

  vec3 vel = mix(v.xyz, target, 1.0 - exp(-uDt * (1.6 + seed)));
  gl_FragColor = vec4(vel, seed);
}
`;
export const dustPositionShader = /* glsl */ `
${TERRAIN}
uniform float uDt;
uniform float uRadius;
uniform sampler2D uSpawn;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  vec3 pos = p.xyz + v.xyz * uDt;
  float life = p.w - uDt * (0.04 + 0.09 * fract(v.w * 7.31));
  float ground = terrainHeight(pos.xz);
  pos.y = max(pos.y, ground + 0.012);
  if (life <= 0.0 || length(pos.xz) > uRadius) {
    pos = texture2D(uSpawn, uv).xyz;
    pos.y = terrainHeight(pos.xz) + 0.02;
    life = 1.0;
  }
  gl_FragColor = vec4(pos, life);
}
`;
export const dustVert = /* glsl */ `
attribute vec2 aRef;
uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uSize;
uniform float uPixelRatio;
uniform float uOrbY;
uniform float uRadius;
varying float vLight;
varying float vAlpha;
void main() {
  vec4 p = texture2D(uPositions, aRef);
  vec4 v = texture2D(uVelocities, aRef);
  float r = length(p.xz);
  // lit by the orb (inverse square) + the beam pool at the impact
  vec3 d = p.xyz - vec3(0.0, uOrbY, 0.0);
  vLight = 3.0 / (1.0 + dot(d, d) * 0.9) + 1.0 * exp(-r * 0.7) + 0.06;
  float speed = length(v.xyz);
  vAlpha = smoothstep(0.0, 0.15, p.w) * smoothstep(1.0, 0.92, p.w) * (1.0 - smoothstep(uRadius * 0.7, uRadius, r)) * (0.5 + min(speed, 2.0) * 0.4);
  vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
  float s = uSize * (0.5 + fract(v.w * 13.7));
  gl_PointSize = max(s * uPixelRatio / -mv.z, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;
export const dustFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying float vLight;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  float a = smoothstep(0.25, 0.0, d);
  gl_FragColor = vec4(uColor * a * vAlpha * vLight * uIntensity, 1.0);
}
`;

/* ── Cyclone (analytic, vertex-shader vortex) ──────────────────────────────── */
/**
 * Each particle rides a helix: it rises over its own period while orbiting the
 * funnel axis with angular speed ∝ 1/r (tight core spins fastest).
 * θ = θ0 + age·ω(r) + uPhase — age is bounded (0..period), so the motion stays
 * smooth forever; uPhase (CPU-integrated) adds the hover spin-up.
 */
const CYCLONE_COMMON = /* glsl */ `
uniform float uTime;
uniform float uPhase;
uniform float uHeight;
uniform float uReveal;
float funnelRadius(float h) { return 0.1 + 0.62 * pow(h, 1.6) + 0.55 * exp(-h * 16.0); }
vec2 funnelWobble(float h, float t) {
  float k = smoothstep(0.0, 0.7, h);
  return vec2(sin(h * 3.1 - t * 0.7) + 0.5 * sin(h * 7.3 + t * 1.1), cos(h * 2.7 - t * 0.6) + 0.5 * sin(h * 6.1 - t * 0.9)) * 0.09 * k;
}
`;
export const cycloneVert = /* glsl */ `
${CYCLONE_COMMON}
attribute vec4 aSeed;
uniform float uSpin;
uniform float uSize;
uniform float uPixelRatio;
varying float vA;
varying float vH;
varying float vMix;
void main() {
  float period = mix(4.5, 8.5, aSeed.y);
  float h = fract(aSeed.x + uTime / period);
  float shell = mix(0.5, 1.12, pow(aSeed.z, 0.6));
  float r = funnelRadius(h) * shell;
  float omega = uSpin * 1.1 / (r + 0.14);
  float theta = aSeed.w * 6.28318 + h * period * omega + uPhase;
  vec2 w = funnelWobble(h, uTime);
  vec3 p = vec3(cos(theta) * r + w.x, h * uHeight, sin(theta) * r + w.y);
  // the funnel builds from the ground up during the reveal
  float build = smoothstep(h, h + 0.25, uReveal * 1.25);
  vA = smoothstep(0.0, 0.05, h) * smoothstep(1.0, 0.8, h) * build * (0.35 + 0.65 * shell);
  vH = h;
  vMix = aSeed.z;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(uSize * (0.5 + aSeed.y) * uPixelRatio / -mv.z, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;
export const cycloneFrag = /* glsl */ `
uniform vec3 uBlue;
uniform vec3 uBeige;
uniform float uIntensity;
varying float vA;
varying float vH;
varying float vMix;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  float a = smoothstep(0.25, 0.0, d);
  vec3 col = mix(uBlue, uBeige, clamp(vMix * 0.7 + vH * 0.4, 0.0, 1.0));
  gl_FragColor = vec4(col * a * vA * uIntensity, 1.0);
}
`;
/** faint helical ribbons wrapping the funnel (LineSegments) */
export const ribbonVert = /* glsl */ `
${CYCLONE_COMMON}
attribute float aT;
attribute float aRibbon;
varying float vA;
varying float vT;
void main() {
  float h = aT;
  float r = funnelRadius(h) * (0.85 + 0.12 * sin(aRibbon * 2.1));
  float theta = aRibbon * 1.2566 + h * (9.0 + aRibbon) - uTime * 1.7 + uPhase;
  vec2 w = funnelWobble(h, uTime);
  vec3 p = vec3(cos(theta) * r + w.x, h * uHeight, sin(theta) * r + w.y);
  float build = smoothstep(h, h + 0.25, uReveal * 1.25);
  vA = smoothstep(0.0, 0.08, h) * smoothstep(1.0, 0.75, h) * build;
  vT = h;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;
export const ribbonFrag = /* glsl */ `
uniform vec3 uBeige;
uniform float uIntensity;
uniform float uTime;
varying float vA;
varying float vT;
void main() {
  float glint = pow(0.5 + 0.5 * sin(vT * 26.0 - uTime * 5.0), 10.0);
  gl_FragColor = vec4(uBeige * vA * (0.08 + glint * 0.6) * uIntensity, 1.0);
}
`;

/* ── Sky (inside of a big sphere that follows the camera) ─────────────────────── */
export const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w * 0.99999; // pinned to the far plane
}
`;
export const skyFrag = /* glsl */ `
${NOISE2D}
uniform vec3 uZenith;
uniform vec3 uHaze;
uniform float uTime;
uniform float uStars;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 col = mix(uHaze, uZenith, smoothstep(-0.02, 0.45, y));
  col += uHaze * 0.35 * exp(-abs(y) * 18.0); // thin bright haze band on the horizon
  // sparse, faint stars — a few, not a starfield demo
  vec2 sp = vec2(atan(d.z, d.x) * 120.0, asin(clamp(y, -1.0, 1.0)) * 120.0);
  vec2 cell = floor(sp);
  float h = hash12(cell);
  vec2 off = hash22(cell + 7.0) - 0.5;
  float star = step(0.993, h) * smoothstep(0.32, 0.0, length(fract(sp) - 0.5 - off * 0.5));
  float tw = 0.6 + 0.4 * sin(uTime * (0.6 + h * 2.0) + h * 40.0);
  col += vec3(0.85, 0.87, 0.9) * star * tw * smoothstep(0.06, 0.35, y) * (h - 0.993) * 90.0 * uStars;
  gl_FragColor = vec4(col, 1.0);
}
`;
