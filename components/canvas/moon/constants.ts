/**
 * Scene layout (world units, inside the "world" group that route poses move around).
 * The beam hits the valley floor at the origin; terrainHeight(0,0) ≈ 0 by construction.
 */
export const ORB_Y = 2.7;          // orb centre height
export const ORB_SCALE = 1.0;       // nebula (radius ≈ 0.95 local) → ≈ 0.95 world
export const BEAM_TOP = ORB_Y - 0.5;
export const CYCLONE_H = ORB_Y - 0.6; // funnel: ground → just under the orb
export const DUST_RADIUS = 22;      // ground dust respawns past this radius

/** Anchor points for the DOM hotspots (world-group local space). */
export const HOTSPOT_ANCHORS = {
  core: [0.72, ORB_Y + 0.38, 0] as const,
  engine: [-0.6, 0.85, 0] as const,
};
