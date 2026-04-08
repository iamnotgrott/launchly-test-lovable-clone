import { MODELS, ModelId } from "./config";

export type TaskType =
  | "planning"
  | "code-generation"
  | "error-repair"
  | "title"
  | "summary";

const TASK_MODEL_MAP: Record<TaskType, ModelId> = {
  "planning": MODELS.FAST,
  "code-generation": MODELS.DEFAULT,
  "error-repair": MODELS.DEFAULT,
  "title": MODELS.FAST,
  "summary": MODELS.FAST,
};

export function selectModelForTask(task: TaskType, preferredModel?: ModelId): ModelId {
  if (preferredModel && preferredModel !== MODELS.DEFAULT) {
    return preferredModel;
  }
  return TASK_MODEL_MAP[task] ?? MODELS.DEFAULT;
}
