export type TaskType =
  | "title"
  | "summary"
  | "classification"
  | "chat"
  | "code-generation"
  | "heavy-reasoning"
  | "large-refactor"
  | "error-repair"
  | "planning";

import { MODELS, ModelId } from "./config";

export function selectModelForTask(task: TaskType): ModelId {
  switch (task) {
    case "title":
    case "summary":
    case "classification":
      return MODELS.FAST;
    case "heavy-reasoning":
    case "large-refactor":
    case "error-repair":
      return MODELS.FALLBACK;
    case "planning":
    case "chat":
    case "code-generation":
    default:
      return MODELS.DEFAULT;
  }
}
