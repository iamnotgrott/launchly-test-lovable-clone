export const MODELS = {
  DEFAULT: "qwen/qwen3.6-plus:free",
  FAST: "stepfun/step-3.5-flash:free",
  FALLBACK: "nvidia/nemotron-3-super-120b-a12b:free",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export const MODEL_NAMES: Record<ModelId, string> = {
  [MODELS.DEFAULT]: "Qwen 3.6 Plus",
  [MODELS.FAST]: "Step 3.5 Flash",
  [MODELS.FALLBACK]: "Nemotron Super 120B",
};

export const MODEL_CAPABILITIES: Record<ModelId, { maxTokens: number; supportsStreaming: boolean }> = {
  [MODELS.DEFAULT]: { maxTokens: 8192, supportsStreaming: true },
  [MODELS.FAST]: { maxTokens: 4096, supportsStreaming: true },
  [MODELS.FALLBACK]: { maxTokens: 4096, supportsStreaming: true },
};

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const MAX_RETRIES = 2;
export const RETRY_BASE_DELAY_MS = 1000;
