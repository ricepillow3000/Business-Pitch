import { create } from "zustand";

export type Phase = "loading" | "reveal" | "ready";

type State = {
  phase: Phase;
  sceneReady: boolean;
  reducedMotion: boolean;
  setPhase: (p: Phase) => void;
  setSceneReady: () => void;
  setReducedMotion: (v: boolean) => void;
};

export const useStore = create<State>((set) => ({
  phase: "loading",
  sceneReady: false,
  reducedMotion: false,
  setPhase: (phase) => set({ phase }),
  setSceneReady: () => set({ sceneReady: true }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
