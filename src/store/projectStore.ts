import { create } from "zustand";
import { ProjectState, Project, FileEntry, Checkpoint, Turn } from "@/types";

interface ProjectStore extends ProjectState {
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  setFiles: (files: FileEntry[]) => void;
  setOpenFiles: (files: string[]) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  setFileContents: (path: string, content: string) => void;
  setCheckpoints: (checkpoints: Checkpoint[]) => void;
  addCheckpoint: (checkpoint: Checkpoint) => void;
  setTurns: (turns: Turn[]) => void;
  addTurn: (turn: Turn) => void;
  updateTurn: (turnId: string, updates: Partial<Turn>) => void;
}

const initialState: ProjectState = {
  projects: [],
  activeProject: null,
  files: [],
  openFiles: [],
  activeFile: null,
  fileContents: {},
  checkpoints: [],
  turns: [],
};

export const useProjectStore = create<ProjectStore>((set) => ({
  ...initialState,

  setProjects: (projects) => set({ projects }),
  setActiveProject: (project) => set({ activeProject: project }),
  setFiles: (files) => set({ files }),
  setOpenFiles: (files) => set({ openFiles: files }),

  openFile: (path) =>
    set((state) => ({
      openFiles: state.openFiles.includes(path) ? state.openFiles : [...state.openFiles, path],
      activeFile: path,
    })),

  closeFile: (path) =>
    set((state) => ({
      openFiles: state.openFiles.filter((f) => f !== path),
      activeFile: state.activeFile === path ? (state.openFiles.filter((f) => f !== path).pop() || null) : state.activeFile,
    })),

  setActiveFile: (path) => set({ activeFile: path }),
  setFileContents: (path, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [path]: content },
    })),

  setCheckpoints: (checkpoints) => set({ checkpoints }),
  addCheckpoint: (checkpoint) =>
    set((state) => ({ checkpoints: [...state.checkpoints, checkpoint] })),

  setTurns: (turns) => set({ turns }),
  addTurn: (turn) => set((state) => ({ turns: [...state.turns, turn] })),
  updateTurn: (turnId, updates) =>
    set((state) => ({
      turns: state.turns.map((t) => (t.id === turnId ? { ...t, ...updates } : t)),
    })),
}));
