export const MODELS = {
  DEFAULT: "nvidia/nemotron-3-super-120b-a12b:free",
  FALLBACK: "qwen/qwen3.6-plus:free",
  FAST: "stepfun/step-3.5-flash:free",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export const MODEL_NAMES: Record<ModelId, string> = {
  [MODELS.DEFAULT]: "Nemotron Super 120B",
  [MODELS.FALLBACK]: "Qwen 3.6 Plus",
  [MODELS.FAST]: "Step 3.5 Flash",
};

export const MODEL_DESCRIPTIONS: Record<ModelId, string> = {
  [MODELS.DEFAULT]: "Most reliable free model",
  [MODELS.FALLBACK]: "Faster but rate limited",
  [MODELS.FAST]: "Fastest, least reliable",
};

export const MODEL_CAPABILITIES: Record<ModelId, { maxTokens: number; supportsStreaming: boolean }> = {
  [MODELS.DEFAULT]: { maxTokens: 8192, supportsStreaming: true },
  [MODELS.FALLBACK]: { maxTokens: 8192, supportsStreaming: true },
  [MODELS.FAST]: { maxTokens: 4096, supportsStreaming: true },
};

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const MAX_RETRIES = 2;
export const RETRY_BASE_DELAY_MS = 1000;
