import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * Procedural, featureless display-mannequin bust at real human proportions
 * (head : neck : shoulders ≈ 1 : 1 with a life-size bust — 1 unit ≈ 11.5 cm).
 *
 * The head is LOFTED from profile tables (half-width, front depth, back depth
 * per height) plus midline features (nose, lips, chin, brow) and ears, so the
 * silhouette reads correctly in profile — the reference is a 3/4-profile view.
 *
 * The head is split HORIZONTALLY across the cranium, just above the nose (CUT).
 * Both parts come from the same surface function, so the seam matches perfectly.
 *
 * This module is the SOURCE for public/models/mannequin.glb
 * (scripts/build-mannequin.ts exports two glTF nodes: "Bust" and "Dome").
 * A hand-sculpted Blender export with the same two node names is a drop-in swap.
 *
 * Head-local space: +Z = face, +Y = up, origin near the centre of the head.
 */

export const CUT = 0.26; // y of the horizontal split: just above the bridge of the nose
const XZ = 0.88; // overall head width/depth scale → w:d:h ≈ 0.6 : 0.9 : 1 (human)

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (x: number, s: number) => Math.exp(-((x / s) ** 2));

/** Catmull-Rom interpolation over a table of [y, value] (y ascending). */
function curve(table: number[][]) {
  return (y: number) => {
    if (y <= table[0][0]) return table[0][1];
    const n = table.length;
    if (y >= table[n - 1][0]) return table[n - 1][1];
    let i = 0;
    while (table[i + 1][0] < y) i++;
    const p0 = table[Math.max(0, i - 1)][1], p1 = table[i][1], p2 = table[i + 1][1], p3 = table[Math.min(n - 1, i + 2)][1];
    const t = (y - table[i][0]) / (table[i + 1][0] - table[i][0]);
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
}

// ── Head profile tables (y from under-chin −1.05 to crown 1.0) ──────────
const Ys = [-1.05, -0.95, -0.85, -0.7, -0.55, -0.4, -0.25, -0.1, 0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 1.0];
const zip = (v: number[]) => Ys.map((y, i) => [y, v[i]]);
const W = curve(zip([0.0, 0.28, 0.42, 0.52, 0.58, 0.62, 0.66, 0.69, 0.71, 0.72, 0.73, 0.72, 0.68, 0.58, 0.4, 0.0])); // half-width
const F = curve(zip([0.0, 0.45, 0.62, 0.66, 0.7, 0.74, 0.78, 0.8, 0.82, 0.84, 0.86, 0.84, 0.76, 0.6, 0.38, 0.0])); // face plane depth
const B = curve(zip([0.0, 0.2, 0.35, 0.55, 0.72, 0.86, 0.96, 1.02, 1.06, 1.08, 1.08, 1.04, 0.95, 0.78, 0.5, 0.0])); // back of skull

// ── Midline features (extra forward protrusion at θ≈0) ──────────────────
const NOSE = curve([[-0.3, 0], [-0.25, 0.06], [-0.17, 0.3], [-0.05, 0.22], [0.08, 0.12], [0.2, 0.04], [0.27, 0]]);
const UPPER_LIP = curve([[-0.5, 0], [-0.44, 0.05], [-0.4, 0.07], [-0.36, 0.04], [-0.32, 0]]);
const LOWER_LIP = curve([[-0.61, 0], [-0.56, 0.04], [-0.52, 0.065], [-0.47, 0.03], [-0.44, 0]]);
const CHIN = curve([[-0.95, 0], [-0.84, 0.08], [-0.75, 0.07], [-0.65, 0]]);
const BROW = curve([[0.24, 0], [0.34, 0.05], [0.44, 0]]);

/** Point on the head surface at height y, angle θ (θ=0 → face, π → back). */
function headPoint(y: number, theta: number, out: THREE.Vector3) {
  const w = W(y);
  const c = Math.cos(theta), s = Math.sin(theta);
  const depth = THREE.MathUtils.lerp(B(y), F(y), smooth(-0.3, 0.3, c)); // smooth front/back blend
  let x = w * s;
  let z = depth * c;
  const r = Math.hypot(x, z) || 1;
  const front = Math.max(0, c);
  const th = Math.atan2(s, c); // −π..π
  const noseW = 0.17 + 0.1 * smooth(-0.05, -0.25, y); // nostrils flare at the base
  let bump =
    NOSE(y) * gauss(th, noseW) +
    (UPPER_LIP(y) + LOWER_LIP(y)) * gauss(th, 0.32) +
    CHIN(y) * gauss(th, 0.45) +
    BROW(y) * gauss(th, 0.8) * front;
  // ears: slightly behind the side of the head
  bump += 0.09 * gauss(y - 0.02, 0.17) * (gauss(th - 1.72, 0.14) + gauss(th + 1.72, 0.14));
  x += (x / r) * bump;
  z += (z / r) * bump;
  return out.set(x * XZ, y, z * XZ);
}

const WALL = 0.955; // inner shell scale → ~3–4.5 cm ceramic wall

/**
 * Loft a band of the head between y0 and y1 (rows × cols, closed around θ).
 * inner=true builds the INSIDE wall: scaled toward the cut plane (so its cut row
 * stays exactly on y = CUT) with reversed winding (normals face the cavity).
 * Normals are made seamless: the duplicated θ = 0 / 2π column (down the nose!)
 * is averaged, and collapsed pole rows get an exact axial normal.
 */
function headBand(y0: number, y1: number, rows: number, cols: number, inner = false) {
  const pos: number[] = [];
  const idx: number[] = [];
  const v = new THREE.Vector3();
  for (let r = 0; r <= rows; r++) {
    const y = y0 + ((y1 - y0) * r) / rows;
    for (let c = 0; c <= cols; c++) {
      headPoint(y, (c / cols) * Math.PI * 2, v);
      if (inner) v.set(v.x * WALL, CUT + (v.y - CUT) * WALL, v.z * WALL);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c, b = a + cols + 1;
      if (inner) idx.push(a, b, a + 1, b, b + 1, a + 1);
      else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();

  // ── seamless normals ──
  const n = g.attributes.normal as THREE.BufferAttribute;
  const t = new THREE.Vector3(), u = new THREE.Vector3();
  for (let r = 0; r <= rows; r++) {
    const i0 = r * (cols + 1), i1 = i0 + cols;
    t.fromBufferAttribute(n, i0).add(u.fromBufferAttribute(n, i1)).normalize();
    n.setXYZ(i0, t.x, t.y, t.z);
    n.setXYZ(i1, t.x, t.y, t.z);
  }
  const pole = (r: number, ny: number) => {
    for (let c = 0; c <= cols; c++) n.setXYZ(r * (cols + 1) + c, 0, inner ? -ny : ny, 0);
  };
  if (W(y1) < 1e-4) pole(rows, 1); // crown
  if (W(y0) < 1e-4) pole(0, -1); // under-chin
  return g;
}

/**
 * Flat ceramic lip on the cut: an annulus between the outer and inner walls at y = CUT.
 * facing = +1 for the lower head (faces up), −1 for the dome (faces down).
 */
function cutLip(cols: number, facing: 1 | -1) {
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  const v = new THREE.Vector3();
  for (let c = 0; c <= cols; c++) {
    headPoint(CUT, (c / cols) * Math.PI * 2, v);
    pos.push(v.x, CUT, v.z, v.x * WALL, CUT, v.z * WALL);
    nrm.push(0, facing, 0, 0, facing, 0);
  }
  for (let c = 0; c < cols; c++) {
    const o = c * 2, i = o + 1, o2 = o + 2, i2 = o + 3;
    if (facing === 1) idx.push(o, i, o2, o2, i, i2);
    else idx.push(o, o2, i, o2, i2, i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

/** Neck + shoulders (static): lathe, widened to real shoulder width, neck leaning forward. */
function bust() {
  const profile = [
    [1.05, -3.7], [1.18, -3.1], [1.2, -2.75], [1.1, -2.45], [0.85, -2.2], [0.6, -2.0],
    [0.47, -1.75], [0.43, -1.3], [0.44, -0.85], [0.46, -0.5], [0.0, -0.45],
  ].map(([r, y]) => new THREE.Vector2(r, y)); // bottom → top = outward-facing faces
  // spline-smooth the silhouette (no straight-segment facets on the shoulder curve)
  const cap = profile.pop()!;
  const smoothProfile = [...new THREE.SplineCurve(profile).getPoints(90), cap];
  const g = new THREE.LatheGeometry(smoothProfile, 160);
  g.deleteAttribute("uv");
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const sh = smooth(-1.95, -2.5, y); // 0 neck → 1 shoulders
    // neck centre leans forward toward the head; torso sits back under it
    const zc = THREE.MathUtils.lerp(-0.18, -0.42, smooth(-0.5, -1.9, y)) + 0.07 * sh;
    const pecs = 0.05 * gauss(y + 2.85, 0.35) * smooth(0, 0.8, z);
    pos.setXYZ(i, x * (1 + sh * 0.55), y, z * (1 - sh * 0.25) + zc + pecs);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * The two parts that become glTF nodes:
 *  - bust: lower head (face below the cut) + neck + shoulders, in head space
 *  - dome: skull cap, re-centred so its ORIGIN sits on the cut plane
 *          (node translation = [0, CUT, 0]) → lifting it is a pure position.y change
 */
export function createMannequinParts() {
  // 192 around (silhouette smoothness) × ~70 rows per unit height; the inner wall needs far fewer rows
  const COLS = 192;
  const lower = mergeGeometries([headBand(-1.05, CUT, 92, COLS), headBand(-1.05, CUT, 48, COLS, true), cutLip(COLS, 1)], false)!;
  const dome = mergeGeometries([headBand(CUT, 1.0, 56, COLS), headBand(CUT, 1.0, 28, COLS, true), cutLip(COLS, -1)], false)!;
  dome.translate(0, -CUT, 0);
  const bustGeo = mergeGeometries([lower, bust()], false)!;
  return { bust: bustGeo, dome };
}
