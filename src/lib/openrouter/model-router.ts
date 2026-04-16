import { MODELS, ModelId } from "./config";

export type TaskType =
  | "planning"
  | "code-generation"
  | "error-repair"
  | "title"
  | "summary";

export function selectModelForTask(_task: TaskType): ModelId {
  return MODELS.DEFAULT;
}
