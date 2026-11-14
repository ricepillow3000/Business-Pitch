import { create } from "zustand";

export type Phase = "loading" | "reveal" | "ready";
export type PanelId = "core" | "engine";

type State = {
  phase: Phase;
  sceneReady: boolean;
  reducedMotion: boolean;
  /** open info panel (click the orb → "core", click the storm → "engine") */
  panel: PanelId | null;
  setPhase: (p: Phase) => void;
  setSceneReady: () => void;
  setReducedMotion: (v: boolean) => void;
  openPanel: (p: PanelId) => void;
  closePanel: () => void;
};

export const useStore = create<State>((set) => ({
  phase: "loading",
  sceneReady: false,
  reducedMotion: false,
  panel: null,
  setPhase: (phase) => set({ phase }),
  setSceneReady: () => set({ sceneReady: true }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
}));
