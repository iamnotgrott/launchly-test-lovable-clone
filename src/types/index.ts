export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  turnId?: string;
  isStreaming: boolean;
  model?: string;
  tokenUsage?: { prompt: number; completion: number };
  createdAt: number;
}

export interface Project {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  workspacePath: string;
  framework?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FileEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export interface FileChange {
  path: string;
  action: "created" | "modified" | "deleted";
  additions: number;
  deletions: number;
}

export interface Turn {
  id: string;
  projectId: string;
  userMessage: string;
  status: "planning" | "executing" | "completed" | "failed" | "repaired";
  filesChanged: FileChange[];
  diffSummary?: string;
  errorMessage?: string;
  retryCount: number;
  model?: string;
  createdAt: number;
  completedAt?: number;
}

export interface Checkpoint {
  id: string;
  projectId: string;
  turnId?: string;
  label?: string;
  ref?: string;
  commitHash?: string;
  turnCount: number;
  files?: Array<{ path: string; additions: number; deletions: number; status: string }>;
  createdAt: number;
}

export interface DiffView {
  from: number;
  to: number;
  diff: string;
  files: Array<{ path: string; additions: number; deletions: number; status: string }>;
}

export interface CheckpointState {
  checkpoints: Checkpoint[];
  activeCheckpoint: Checkpoint | null;
  diffView: DiffView | null;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  currentTurnId?: string;
  planText?: string;
  isPlanning: boolean;
}

export interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  files: FileEntry[];
  openFiles: string[];
  activeFile: string | null;
  fileContents: Record<string, string>;
  checkpoints: Checkpoint[];
  turns: Turn[];
}
