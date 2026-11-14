"use client";
import dynamic from "next/dynamic";
// WebGL is client-only; keep three.js out of the server bundle entirely.
const Scene = dynamic(() => import("./Scene"), { ssr: false });
export function CanvasRoot() {
  return <Scene />;
}
