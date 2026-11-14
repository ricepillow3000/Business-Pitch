import * as THREE from "three";

/* Deterministic RNG so the brain is identical on every load (and SSR-safe). */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ═══════════════════════════════════════════════════════════════════
   STRINGS OF LIGHT — routed like circuit traces, forming a brain silhouette
   Core-local space: origin = centre of the ball of light, +Z face, +Y up.

   • 6 sagittal "layers" (x-slices) — none at x = 0, which leaves the
     longitudinal fissure: two hemispheres read even in pure line-work.
   • Per layer: the outer brain contour + inner partial arcs (gyri), all
     snapped to a grid and routed OCTILINEARLY (0° / 45° / 90° only) → PCB look.
   • Spokes route from the ball of light out to the contour: power from the core.
   • Lateral buses bridge the hemispheres across the fissure.
   • Vias (solder pads) at trace ends; 5 of them are the agent hubs.
   Every trace carries aProgress (0→1 by arc length) for pulses + draw-on.
   ═══════════════════════════════════════════════════════════════════ */

const GRID = 0.028;
const gauss = (x: number, s: number) => Math.exp(-((x / s) ** 2));
type V2 = { z: number; y: number };

/** Side-view brain silhouette, polar in the (z, y) plane. φ = 0 → front. */
function silhouette(phi: number, scale: number): V2 {
  const a = 0.62, b = 0.4;
  const c = Math.cos(phi), s = Math.sin(phi);
  let r = (a * b) / Math.sqrt((b * c) ** 2 + (a * s) ** 2);
  r += 0.05 * gauss(phi - 0.9, 0.5); // frontal lobe
  r -= 0.1 * gauss(phi + 0.75, 0.25); // temporal notch
  r += 0.07 * gauss(phi + 2.45, 0.3); // cerebellum
  if (s < 0) r *= 1 - 0.15 * -s; // flatter underside
  return { z: r * c * scale, y: r * s * scale };
}

const snap = (v: number) => Math.round(v / GRID) * GRID;

/** Route a→b with one 45° leg then a straight leg (PCB style). Returns points after a. */
function octilinear(a: V2, b: V2): V2[] {
  const dz = b.z - a.z, dy = b.y - a.y;
  const d = Math.min(Math.abs(dz), Math.abs(dy));
  const mid = { z: a.z + Math.sign(dz) * d, y: a.y + Math.sign(dy) * d };
  const out: V2[] = [];
  if (Math.abs(mid.z - a.z) + Math.abs(mid.y - a.y) > 1e-6 && Math.abs(mid.z - b.z) + Math.abs(mid.y - b.y) > 1e-6) out.push(mid);
  out.push(b);
  return out;
}

/** Sample a contour arc, snap to grid, route octilinearly. */
function routedArc(phi0: number, phi1: number, scale: number, steps: number): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = silhouette(phi0 + ((phi1 - phi0) * i) / steps, scale);
    const q = { z: snap(p.z), y: snap(p.y) };
    if (!pts.length) pts.push(q);
    else {
      const last = pts[pts.length - 1];
      if (last.z !== q.z || last.y !== q.y) pts.push(...octilinear(last, q));
    }
  }
  return pts;
}

type Trace = THREE.Vector3[];

function toSegments(traces: Trace[], rand: () => number, kindSeed = 0) {
  const pos: number[] = [], prog: number[] = [], seed: number[] = [];
  traces.forEach((t) => {
    let total = 0;
    const acc = [0];
    for (let i = 1; i < t.length; i++) acc.push((total += t[i].distanceTo(t[i - 1])));
    const s = (rand() + kindSeed) % 1;
    for (let i = 1; i < t.length; i++) {
      for (const k of [i - 1, i]) {
        pos.push(t[k].x, t[k].y, t[k].z);
        prog.push(total > 0 ? acc[k] / total : 0);
        seed.push(s);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aProgress", new THREE.Float32BufferAttribute(prog, 1));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  return g;
}

export function createTraces() {
  const rand = mulberry32(7);
  const traces: Trace[] = [];
  const vias: THREE.Vector3[] = [];
  const layers = [-0.34, -0.22, -0.1, 0.1, 0.22, 0.34];
  const BALL = 0.11;

  layers.forEach((x) => {
    const sx = Math.sqrt(1 - (x / 0.42) ** 2);
    const lift = (pts: V2[]) => pts.map((p) => new THREE.Vector3(x, p.y, p.z));
    // outer contour (closed loop)
    traces.push(lift(routedArc(-Math.PI, Math.PI, sx, 44)));
    // inner gyri arcs
    for (const sc of [0.74, 0.52]) {
      for (let k = 0; k < 2; k++) {
        const p0 = -Math.PI + rand() * Math.PI * 2;
        const len = 1.1 + rand() * 1.6;
        const arc = lift(routedArc(p0, p0 + len, sx * sc, 14));
        traces.push(arc);
        vias.push(arc[0], arc[arc.length - 1]);
      }
    }
    // spokes: from the ball of light out to the contour
    for (let k = 0; k < 3; k++) {
      const phi = -Math.PI + ((k + rand() * 0.6) / 3) * Math.PI * 2;
      const start = { z: snap(Math.cos(phi) * BALL), y: snap(Math.sin(phi) * BALL) };
      const endRaw = silhouette(phi, sx * 0.97);
      const end = { z: snap(endRaw.z), y: snap(endRaw.y) };
      const pts = [new THREE.Vector3(x * 0.25, start.y, start.z), ...octilinear(start, end).map((p) => new THREE.Vector3(x, p.y, p.z))];
      traces.push(pts);
      vias.push(pts[pts.length - 1]);
    }
  });

  // lateral buses across the fissure (wrap the core in 3D)
  for (let k = 0; k < 7; k++) {
    const phi = -Math.PI + ((k + 0.5) / 7) * Math.PI * 2;
    const bus: Trace = layers.map((x) => {
      const p = silhouette(phi, Math.sqrt(1 - (x / 0.42) ** 2));
      return new THREE.Vector3(x, snap(p.y), snap(p.z));
    });
    traces.push(bus);
  }

  // 5 agent hubs = well-spread vias (farthest-point sampling)
  const hubs: THREE.Vector3[] = [vias[0]];
  while (hubs.length < 5) {
    let best = vias[0], bestD = -1;
    for (const v of vias) {
      const d = Math.min(...hubs.map((h) => h.distanceToSquared(v)));
      if (d > bestD) { bestD = d; best = v; }
    }
    hubs.push(best);
  }

  const viaGeo = new THREE.BufferGeometry().setFromPoints(vias);
  viaGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(vias.map(() => rand()), 1));

  return { lines: toSegments(traces, rand), vias: viaGeo, hubs };
}

/**
 * EXIT TRACES — strings that leave the head and snake out across the page.
 * Built in screen-aligned space (x right, y up), origin = core centre, so they
 * read as circuitry running across the website. Long and octilinear.
 */
export function createExitTraces(count = 8) {
  const rand = mulberry32(99);
  const traces: Trace[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const y0 = snap(-0.15 + rand() * 0.45);
    const pts: V2[] = [{ z: snap(side * 0.25), y: y0 }]; // using {z:x}
    let cur = pts[0];
    const legs = 3 + Math.floor(rand() * 3);
    for (let l = 0; l < legs; l++) {
      const nx = cur.z + side * (0.6 + rand() * 2.2);
      const ny = snap(cur.y + (rand() * 2 - 1) * 1.4);
      const next = { z: snap(nx), y: ny };
      pts.push(...octilinear(cur, next));
      cur = next;
    }
    pts.push({ z: side * 14, y: cur.y }); // run off-screen
    traces.push(pts.map((p) => new THREE.Vector3(p.z, p.y, -0.25)));
  }
  return toSegments(traces, rand, 0.5);
}

/** Ambient "nebula" around the brain; collapses into a vertical beam on scroll (ref video). */
export function createCloud(count = 4200) {
  const rand = mulberry32(9);
  const pos = new Float32Array(count * 3);
  const beam = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // gaussian-ish shell, flattened, slightly above the brain like the reference nebula
    const u = rand() * Math.PI * 2;
    const v = Math.acos(2 * rand() - 1);
    const r = 1.35 + Math.pow(rand(), 1.8) * 3.2;
    pos[i * 3] = Math.sin(v) * Math.cos(u) * r * 1.25;
    pos[i * 3 + 1] = Math.cos(v) * r * 0.75 + 0.6;
    pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
    // beam target: thin vertical column through the brain
    const br = Math.pow(rand(), 3) * 0.12;
    const ba = rand() * Math.PI * 2;
    beam[i * 3] = Math.cos(ba) * br;
    beam[i * 3 + 1] = -1.5 + Math.pow(rand(), 0.7) * 16;
    beam[i * 3 + 2] = Math.sin(ba) * br;
    seed[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aBeam", new THREE.BufferAttribute(beam, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  return g;
}
