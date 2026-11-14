/* GLSL kept as TS strings → no bundler loader config needed. */

export const COLORS = {
  void: "#152626",
  slate: "#2f4f4f",
  signal: "#6e9bf0",
  flag: "#0a3161",
  beige: "#f5f5dc",
};

/* ── Neural pathways: travelling pulses = agents executing a workflow ── */
export const pathwayVert = /* glsl */ `
  attribute float aProgress;
  attribute float aSeed;
  attribute float aHub;
  varying float vProgress;
  varying float vSeed;
  varying float vHub;
  varying vec3 vLocal;
  void main() {
    vProgress = aProgress;
    vSeed = aSeed;
    vHub = aHub;
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const pathwayFrag = /* glsl */ `
  uniform float uTime;
  uniform float uActivity;   // 0..~2 : scroll velocity + hover + section boosts
  uniform vec3  uBlue;
  uniform vec3  uBeige;
  uniform vec3  uHover;      // hover point in brain-local space
  uniform float uHoverAmt;
  uniform float uFocusHub;   // -1 none, else highlight one agent's workflow
  varying float vProgress;
  varying float vSeed;
  varying float vHub;
  varying vec3 vLocal;

  void main() {
    float speed = 0.16 + vSeed * 0.22;
    // two pulses per path, offset → feels like a queue of tasks
    float h1 = fract(uTime * speed * (0.7 + uActivity) + vSeed * 13.1);
    float h2 = fract(h1 + 0.5);
    float d1 = h1 - vProgress;
    float d2 = h2 - vProgress;
    float trail = smoothstep(0.28, 0.0, d1) * step(0.0, d1)
                + smoothstep(0.28, 0.0, d2) * step(0.0, d2) * 0.6;
    float tip = smoothstep(0.025, 0.0, abs(d1)) + smoothstep(0.025, 0.0, abs(d2)) * 0.6;

    float hover = uHoverAmt * smoothstep(0.55, 0.0, distance(vLocal, uHover));
    float focus = uFocusHub < 0.0 ? 0.0 : (1.0 - step(0.5, abs(vHub - uFocusHub)));

    vec3 tint = mix(uBlue, uBeige, step(0.62, vSeed));
    float base = 0.06 + hover * 0.5 + focus * 0.25;
    vec3 col = tint * (base + trail * (0.55 + uActivity * 0.6) + hover * 1.4)
             + uBeige * tip * (1.2 + uActivity);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ── Nodes (synapses) ── */
export const nodeVert = /* glsl */ `
  attribute float aSeed;
  attribute float aScale;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uActivity;
  varying float vFlash;
  varying float vHub;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float f = pow(0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 4.0) + aSeed * 40.0), 14.0);
    vFlash = f * (0.6 + uActivity);
    vHub = step(3.0, aScale);
    gl_PointSize = (aScale * (1.0 + f * 1.5) * 9.0 * uPixelRatio) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const nodeFrag = /* glsl */ `
  uniform vec3 uBlue;
  uniform vec3 uBeige;
  varying float vFlash;
  varying float vHub;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    core *= core;
    vec3 col = mix(uBlue * 0.6, uBeige, max(vHub, vFlash));
    gl_FragColor = vec4(col * core * (0.35 + vFlash * 1.6 + vHub * 1.2), 1.0);
  }
`;

/* ── Holographic shell: fresnel rim + moving scanlines over the glass ── */
export const shellVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vLocal;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    vLocal = position;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const shellFrag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uBlue;
  uniform vec3 uBeige;
  uniform float uIntensity;
  uniform vec3 uHover;
  uniform float uHoverAmt;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vLocal;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
    float scan = 1.0 - smoothstep(0.0, 0.05, abs(fract(vLocal.y * 34.0 - uTime * 0.35) - 0.5));
    float sweep = smoothstep(0.08, 0.0, abs(fract(uTime * 0.12) * 3.0 - 1.5 - vLocal.y));
    float hover = uHoverAmt * smoothstep(0.5, 0.0, distance(vLocal, uHover));
    vec3 col = mix(uBlue, uBeige, smoothstep(0.35, 0.95, fres));
    float a = fres * 0.85 + scan * 0.03 + sweep * 0.12 + hover * 0.35;
    gl_FragColor = vec4(col * a * uIntensity, 1.0);
  }
`;

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
    gl_FragColor = vec4(col * s * s * vAlpha * uOpacity, 1.0);
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
