/* ════════════════════════════════════════════════════════════════════
   THE ORB — GPGPU PARTICLE NEBULA
   Two float textures, ping-ponged on the GPU by GPUComputationRenderer:
     texturePosition  rgb = position (core-local),  a = life 1 → 0
     textureVelocity  rgb = velocity,               a = per-particle seed
   One texel = one particle. 512² = 262,144 particles, zero CPU work per frame.
   ════════════════════════════════════════════════════════════════════ */

/* 3D simplex noise — Ashima Arts / Stefan Gustavson (MIT) */
export const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
/* Curl of a 3-component noise potential → divergence-free flow (fluid-like, no sinks) */
vec3 snoiseVec3(vec3 x){
  return vec3(snoise(x), snoise(vec3(x.y-19.1, x.z+33.4, x.x+47.2)), snoise(vec3(x.z+74.2, x.x-124.5, x.y+99.4)));
}
vec3 curlNoise(vec3 p){
  const float e = 0.1;
  vec3 dx=vec3(e,0.0,0.0), dy=vec3(0.0,e,0.0), dz=vec3(0.0,0.0,e);
  vec3 px0=snoiseVec3(p-dx), px1=snoiseVec3(p+dx);
  vec3 py0=snoiseVec3(p-dy), py1=snoiseVec3(p+dy);
  vec3 pz0=snoiseVec3(p-dz), pz1=snoiseVec3(p+dz);
  float x=py1.z-py0.z-pz1.y+pz0.y;
  float y=pz1.x-pz0.x-px1.z+px0.z;
  float z=px1.y-px0.y-py1.x+py0.x;
  return normalize(vec3(x,y,z)/(2.0*e) + 1e-6);
}
`;

/**
 * VELOCITY PASS — forces:
 *  1. curl-noise turbulence (two octaves, domain drifting in time) → swirling fluid
 *  2. soft spring to the centre that stiffens past the cavity radius → contained orb
 *  3. three orbiting attractors that pull and then repel past a core radius → clumps
 *     form, stream and disperse (the "attract & repel" behaviour)
 *  4. weak repulsion at the very centre → it breathes instead of collapsing to a point
 * Damped (exp decay) → inertia: motion lags and overshoots like a fluid.
 */
export const velocityShader = /* glsl */ `
uniform float uTime;
uniform float uDt;
uniform float uRadius;
uniform float uActivity;
uniform float uOpen;            // 0 dormant → 1 ignited (radius grows to the full orb)
uniform vec3 uPointer;          // cursor projected into core-local space
uniform float uPointerStrength;
uniform float uBurst;           // click shockwave, decays on the CPU
uniform vec3 uAttractors[3];
${SIMPLEX}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  vec3 pos = p.xyz;
  float seed = v.w;
  float r = length(pos);

  // large-scale curl → sprawling arms; fine curl → grain and wisps (Lusion-style nebula)
  vec3 force = curlNoise(pos * 1.7 + vec3(0.0, uTime * 0.09, uTime * 0.04)) * (0.7 + uActivity * 0.6);
  force += curlNoise(pos * 6.5 - vec3(uTime * 0.18)) * 0.28;

  // containment: soft spring, stiff wall at uRadius → a round orb with wispy arms
  vec3 q = pos;
  float rq = length(q);
  force -= q * (1.5 + smoothstep(uRadius * 0.75, uRadius * 1.05, rq) * 18.0);
  force.y -= 0.05 * uOpen * (0.4 + seed);                                          // a faint drip toward the beam

  // INTERACTION — cursor pushes particles away and spins them into a vortex
  vec3 dp = pos - uPointer;
  float fall = exp(-dot(dp, dp) * 18.0) * uPointerStrength;
  vec3 dn = normalize(dp + 1e-5);
  force += (dn * 0.8 + cross(dn, vec3(0.0, 1.0, 0.0)) * 1.1) * fall; // part + swirl, never explode
  // click → radial shockwave through the nebula
  force += normalize(pos + 1e-5) * uBurst * 2.6 * exp(-r * r * 3.0);

  for (int i = 0; i < 3; i++) {
    vec3 d = uAttractors[i] - pos;
    float dd = dot(d, d);
    float pull = 0.035 / (dd + 0.012);                                             // attract …
    float push = 0.0009 / (dd * dd + 0.0004);                                      // … repel up close
    force += normalize(d + 1e-5) * (pull - push) * (0.6 + seed * 0.8);
  }
  force += normalize(pos + 1e-5) * 0.05 / (r * r * 60.0 + 0.25);                   // central breathing

  vec3 vel = v.xyz * exp(-uDt * 2.2) + force * uDt;
  // freshly respawned particle → start still
  if (p.w > 0.995) vel *= 0.2;
  gl_FragColor = vec4(vel, seed);
}
`;

/** POSITION PASS — integrate, age, respawn inside the core from the spawn texture. */
export const positionShader = /* glsl */ `
uniform float uDt;
uniform sampler2D uSpawn;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  vec3 pos = p.xyz + v.xyz * uDt;
  float life = p.w - uDt * (0.06 + 0.14 * fract(v.w * 7.31));
  if (life <= 0.0) {
    pos = texture2D(uSpawn, uv).xyz;
    life = 1.0;
  }
  gl_FragColor = vec4(pos, life);
}
`;

/** RENDER — each point looks up its own texel; size attenuated; ~3% are big soft "bokeh" motes. */
export const particleVert = /* glsl */ `
attribute vec2 aRef;
uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uSize;
uniform float uPixelRatio;
uniform float uRadius;
varying float vR;
varying float vLife;
varying float vSpeed;
varying float vSeed;
varying float vBokeh;
void main() {
  vec4 p = texture2D(uPositions, aRef);
  vec4 v = texture2D(uVelocities, aRef);
  vLife = p.w;
  vR = length(p.xyz) / uRadius;
  vSpeed = length(v.xyz);
  vSeed = v.w;
  vBokeh = step(0.97, fract(v.w * 13.7));
  vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
  float s = uSize * (0.45 + v.w * 0.9) * mix(1.0, 4.5, vBokeh);
  gl_PointSize = s * uPixelRatio / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

/**
 * Additive: every particle adds a little light; where thousands overlap in the centre
 * the sum blows past 1.0 → an intensely bright core that fades to wisps at the edges.
 * Colour = Flag Blue (slow / old) ↔ Beige (fast / young).
 */
export const particleFrag = /* glsl */ `
uniform vec3 uBlue;
uniform vec3 uBeige;
uniform float uIntensity;
uniform float uTime;
varying float vR;
varying float vLife;
varying float vSpeed;
varying float vSeed;
varying float vBokeh;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  float a = vBokeh > 0.5 ? smoothstep(0.25, 0.12, d) * 0.35 : smoothstep(0.25, 0.0, d);
  float fade = smoothstep(0.0, 0.18, vLife) * smoothstep(1.0, 0.9, vLife);
  float t = clamp(vSpeed * 2.4 + vLife * 0.35 - 0.15, 0.0, 1.0);
  vec3 col = mix(uBlue, uBeige, t);
  // dense centre gets its brightness from overlap; boost the sparse outskirts so wisps stay visible
  float edgeBoost = 1.0 + vR * vR * 5.0 + vBokeh * 5.0;
  // granular glints: ~1 in 6 particles flashes briefly → distinct flecks over the smoke (Lusion texture)
  float glint = step(0.83, fract(vSeed * 41.3)) * pow(0.5 + 0.5 * sin(uTime * (1.5 + vSeed * 3.0) + vSeed * 90.0), 18.0) * 14.0;
  gl_FragColor = vec4(col * a * fade * (edgeBoost + glint) * uIntensity, 1.0);
}
`;
