import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Strip to position-only + weld seams so computeVertexNormals is seamless. */
function weld(g: THREE.BufferGeometry) {
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  return mergeVertices(g, 1e-4);
}

/**
 * Procedural cerebrum: ellipsoid + longitudinal fissure + domain-warped
 * "sulci" grooves. Stylised, not anatomical — reads as a brain, looks like an artifact.
 */
function cerebrum(noise: SimplexNoise) {
  const g = weld(new THREE.SphereGeometry(1, 200, 150));
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);

    // domain warp → meandering folds instead of blobs
    const wx = x + 0.35 * noise.noise3d(x * 1.7, y * 1.7, z * 1.7);
    const wy = y + 0.35 * noise.noise3d(x * 1.7 + 11, y * 1.7, z * 1.7);
    const wz = z + 0.35 * noise.noise3d(x * 1.7, y * 1.7 + 23, z * 1.7);
    // sulci = thin grooves where noise crosses zero; gyri = plateaus between
    const n1 = Math.abs(noise.noise3d(wx * 3.1, wy * 3.1, wz * 3.1));
    const n2 = Math.abs(noise.noise3d(wx * 6.4 + 5, wy * 6.4, wz * 6.4));
    const folds = smoothstep(0.0, 0.22, n1) * 0.055 + smoothstep(0.0, 0.2, n2) * 0.02;

    // longitudinal fissure between hemispheres (top only)
    const fissure = Math.exp(-((x / 0.075) ** 2)) * smoothstep(-0.45, 0.45, y);

    const r = 1 + folds - fissure * 0.2;
    let sx = x * r * 0.74;
    let sy = y * r * 0.66;
    let sz = z * r;

    // flatter underside, taller frontal lobe, temporal-lobe bulge
    if (sy < -0.12) sy = -0.12 + (sy + 0.12) * 0.62;
    sy += 0.07 * smoothstep(0.1, 0.9, z) * smoothstep(-0.2, 0.4, y);
    sx *= 1 + 0.08 * smoothstep(0.1, -0.5, y) * smoothstep(-0.6, 0.3, z);

    p.setXYZ(i, sx, sy, sz);
  }
  g.computeVertexNormals();
  return g;
}

/** Cerebellum: tucked under the back, fine horizontal ridges. */
function cerebellum() {
  const g = weld(new THREE.SphereGeometry(1, 120, 80));
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ridges = 1 + 0.035 * Math.pow(Math.abs(Math.sin(y * 26)), 0.5);
    const notch = 1 - 0.12 * Math.exp(-((x / 0.12) ** 2)) * smoothstep(-0.2, 0.6, z);
    const r = ridges * notch;
    p.setXYZ(i, x * r * 0.5, y * r * 0.27, z * r * 0.32 - 0.62);
  }
  g.translate(0, -0.42, 0);
  g.computeVertexNormals();
  return g;
}

function stem() {
  const g = new THREE.CylinderGeometry(0.12, 0.075, 0.62, 32, 1, true);
  g.rotateX(0.32);
  g.translate(0, -0.62, -0.32);
  const w = weld(g);
  w.computeVertexNormals();
  return w;
}

export function createBrainGeometry() {
  const noise = new SimplexNoise({ random: mulberry32(1337) });
  const parts = [cerebrum(noise), cerebellum(), stem()];
  const merged = mergeGeometries(parts, false)!;
  merged.computeBoundingSphere();
  return { merged, cerebrum: parts[0] };
}

/* ═══════════════════════════════════════════════════════════════════
   NEURAL PATHWAYS — the "agent workflow" visualisation
   1. Sample N nodes on the cerebrum, pushed inward (inside the glass).
   2. Pick 5 hubs by farthest-point sampling → the 5 agent units.
   3. From each hub, random-walk through k-nearest neighbours,
      biased away from the hub → organic branching "workflows".
   4. Each walk → CatmullRom curve → thin tube with per-vertex
      aProgress (0→1 along path) + aSeed. The shader animates pulses.
   ═══════════════════════════════════════════════════════════════════ */
export function createPathways(cerebrumGeo: THREE.BufferGeometry, opts = { nodes: 640, pathsPerHub: 15 }) {
  const rand = mulberry32(42);
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(cerebrumGeo));
  // setRandomGenerator exists at runtime but is missing from @types/three
  (sampler as unknown as { setRandomGenerator: (f: () => number) => void }).setRandomGenerator(rand);
  sampler.build();
  const nodes: THREE.Vector3[] = [];
  const tmp = new THREE.Vector3();
  for (let i = 0; i < opts.nodes; i++) {
    sampler.sample(tmp);
    // pull inward with a little depth jitter so pathways live in a shell inside the glass
    nodes.push(tmp.clone().multiplyScalar(0.8 + rand() * 0.1));
  }

  // farthest-point sampling for 5 well-spread hubs
  const hubs: number[] = [Math.floor(rand() * nodes.length)];
  while (hubs.length < 5) {
    let best = 0, bestD = -1;
    nodes.forEach((n, i) => {
      const d = Math.min(...hubs.map((h) => n.distanceToSquared(nodes[h])));
      if (d > bestD) { bestD = d; best = i; }
    });
    hubs.push(best);
  }

  // kNN (brute force is fine at this size, runs once)
  const K = 8;
  const knn = nodes.map((a, i) =>
    nodes
      .map((b, j) => ({ j, d: a.distanceToSquared(b) }))
      .filter((o) => o.j !== i)
      .sort((u, v) => u.d - v.d)
      .slice(0, K)
      .map((o) => o.j),
  );

  const tubes: THREE.BufferGeometry[] = [];
  hubs.forEach((hub, hubIndex) => {
    for (let p = 0; p < opts.pathsPerHub; p++) {
      const visited = new Set([hub]);
      const walk = [hub];
      const hops = 6 + Math.floor(rand() * 8);
      let cur = hub;
      for (let s = 0; s < hops; s++) {
        const options = knn[cur].filter((j) => !visited.has(j));
        if (!options.length) break;
        // bias away from hub, with randomness
        options.sort(
          (a, b) =>
            nodes[b].distanceTo(nodes[hub]) + rand() * 0.25 - (nodes[a].distanceTo(nodes[hub]) + rand() * 0.25),
        );
        cur = options[Math.floor(rand() * Math.min(3, options.length))];
        visited.add(cur);
        walk.push(cur);
      }
      if (walk.length < 4) continue;
      const curve = new THREE.CatmullRomCurve3(walk.map((i) => nodes[i]), false, "centripetal");
      const seg = walk.length * 10;
      const radial = 3;
      const tube = new THREE.TubeGeometry(curve, seg, 0.0045, radial, false);
      tube.deleteAttribute("uv");
      tube.deleteAttribute("normal");
      const count = tube.attributes.position.count;
      const prog = new Float32Array(count);
      const seed = new Float32Array(count);
      const hubAttr = new Float32Array(count);
      const s = rand();
      for (let v = 0; v < count; v++) {
        prog[v] = Math.floor(v / (radial + 1)) / seg;
        seed[v] = s;
        hubAttr[v] = hubIndex;
      }
      tube.setAttribute("aProgress", new THREE.BufferAttribute(prog, 1));
      tube.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      tube.setAttribute("aHub", new THREE.BufferAttribute(hubAttr, 1));
      tubes.push(tube);
    }
  });

  const pathways = mergeGeometries(tubes, false)!;

  // node point cloud
  const nodePos = new Float32Array(nodes.length * 3);
  const nodeSeed = new Float32Array(nodes.length);
  const nodeScale = new Float32Array(nodes.length);
  nodes.forEach((n, i) => {
    n.toArray(nodePos, i * 3);
    nodeSeed[i] = rand();
    nodeScale[i] = hubs.includes(i) ? 4.5 : 0.6 + rand() * 0.8;
  });
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
  nodeGeo.setAttribute("aSeed", new THREE.BufferAttribute(nodeSeed, 1));
  nodeGeo.setAttribute("aScale", new THREE.BufferAttribute(nodeScale, 1));

  return { pathways, nodeGeo, hubs: hubs.map((h) => nodes[h].clone()) };
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
