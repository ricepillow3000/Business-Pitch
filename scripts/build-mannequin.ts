/**
 * Builds public/models/mannequin.glb from the procedural sculpt.
 *
 *   npx tsx scripts/build-mannequin.ts
 *
 * Output: glTF 2.0 binary with two nodes the site expects:
 *   "Bust" — face below the cut + neck + shoulders
 *   "Dome" — skull cap; node origin on the cut plane (translation [0, CUT, 0])
 * A Blender export with the same node names (and +Z face, +Y up) is a drop-in replacement.
 */
import { writeFileSync } from "node:fs";
import * as THREE from "three";
import { CUT, createMannequinParts } from "../components/canvas/mannequinGeometry";

type Prim = { name: string; geo: THREE.BufferGeometry; translation: [number, number, number] };

function writeGlb(prims: Prim[], file: string) {
  const chunks: Buffer[] = [];
  let offset = 0;
  const bufferViews: object[] = [];
  const accessors: object[] = [];
  const push = (data: Buffer, target: number) => {
    const pad = (4 - (data.length % 4)) % 4;
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length, target });
    chunks.push(data, Buffer.alloc(pad));
    offset += data.length + pad;
    return bufferViews.length - 1;
  };

  const meshes = prims.map(({ name, geo }) => {
    const pos = geo.attributes.position.array as Float32Array;
    const nrm = geo.attributes.normal.array as Float32Array;
    const idx = geo.index!.array;
    const count = pos.length / 3;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < count; i++)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], pos[i * 3 + k]);
        max[k] = Math.max(max[k], pos[i * 3 + k]);
      }
    const big = count > 65535;
    const idxBuf = big ? Buffer.from(new Uint32Array(idx).buffer) : Buffer.from(new Uint16Array(idx).buffer);
    const vPos = push(Buffer.from(new Float32Array(pos).buffer), 34962);
    // KHR_mesh_quantization: normals as normalized int16 (×4 smaller error than 8-bit; no visible faceting)
    const q = new Int16Array(count * 4); // VEC3 padded to 4 for 4-byte vertex stride alignment
    for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) q[i * 4 + k] = Math.round(Math.max(-1, Math.min(1, nrm[i * 3 + k])) * 32767);
    const vNrm = push(Buffer.from(q.buffer), 34962);
    (bufferViews[vNrm] as { byteStride?: number }).byteStride = 8;
    const vIdx = push(idxBuf, 34963);
    accessors.push({ bufferView: vPos, componentType: 5126, count, type: "VEC3", min, max });
    accessors.push({ bufferView: vNrm, componentType: 5122, normalized: true, count, type: "VEC3" });
    accessors.push({ bufferView: vIdx, componentType: big ? 5125 : 5123, count: idx.length, type: "SCALAR" });
    const a = accessors.length;
    return { name, primitives: [{ attributes: { POSITION: a - 3, NORMAL: a - 2 }, indices: a - 1, mode: 4 }] };
  });

  const bin = Buffer.concat(chunks);
  const json = {
    asset: { version: "2.0", generator: "jido build-mannequin" },
    extensionsUsed: ["KHR_mesh_quantization"],
    extensionsRequired: ["KHR_mesh_quantization"],
    scene: 0,
    scenes: [{ name: "Mannequin", nodes: prims.map((_, i) => i) }],
    nodes: prims.map((p, i) => ({ name: p.name, mesh: i, translation: p.translation })),
    meshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };
  let jsonBuf = Buffer.from(JSON.stringify(json));
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jsonBuf.length, 0);
  jh.writeUInt32LE(0x4e4f534a, 4); // "JSON"
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length, 0);
  bh.writeUInt32LE(0x004e4942, 4); // "BIN\0"
  writeFileSync(file, Buffer.concat([header, jh, jsonBuf, bh, bin]));
  return 12 + 8 + jsonBuf.length + 8 + bin.length;
}

const { bust, dome } = createMannequinParts();
const bytes = writeGlb(
  [
    { name: "Bust", geo: bust, translation: [0, 0, 0] },
    { name: "Dome", geo: dome, translation: [0, CUT, 0] },
  ],
  "public/models/mannequin.glb",
);
console.log(`mannequin.glb written: ${(bytes / 1024).toFixed(0)} KB · bust ${bust.attributes.position.count} verts · dome ${dome.attributes.position.count} verts`);
