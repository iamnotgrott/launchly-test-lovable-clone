import { create } from "zustand";
import { Checkpoint, CheckpointState } from "@/types";

export interface CheckpointStore extends CheckpointState {
  setCheckpoints: (checkpoints: Checkpoint[]) => void;
  addCheckpoint: (checkpoint: Checkpoint) => void;
  setActiveCheckpoint: (checkpoint: Checkpoint | null) => void;
  setDiffView: (diff: CheckpointState["diffView"]) => void;
  clearCheckpoints: () => void;
}

const initialState: CheckpointState = {
  checkpoints: [],
  activeCheckpoint: null,
  diffView: null,
};

export const useCheckpointStore = create<CheckpointStore>((set) => ({
  ...initialState,
  setCheckpoints: (checkpoints) => set({ checkpoints }),
  addCheckpoint: (checkpoint) => set((state) => ({ checkpoints: [...state.checkpoints, checkpoint] })),
  setActiveCheckpoint: (activeCheckpoint) => set({ activeCheckpoint }),
  setDiffView: (diffView) => set({ diffView }),
  clearCheckpoints: () => set(initialState),
}));
