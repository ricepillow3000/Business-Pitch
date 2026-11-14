/* GLSL kept as TS strings → no bundler loader config needed. Moon-scene shaders live in ./moon/moonShaders.ts */

/** Brand palette, mirrored from app/globals.css @theme (neutral dark slate GRAY). */
export const COLORS = {
  void: "#14181b",      // page background, deepest
  slate: "#2b3237",     // surfaces, glows, horizon haze
  slateDeep: "#1e2428", // cards / raised panels
  signal: "#6e9bf0",
  flag: "#0a3161",
  beige: "#f5f5dc",
  /** moon regolith base albedo (pale neutral gray; the shader lightens the valley floor, darkens ridges) */
  regolith: "#8a8f93",
  /** night sky */
  zenith: "#090b0d",
  haze: "#2a3035",
};
