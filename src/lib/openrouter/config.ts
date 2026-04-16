export const MODELS = {
  DEFAULT: "nvidia/nemotron-3-super-120b-a12b:free",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export const MODEL_NAMES: Record<ModelId, string> = {
  [MODELS.DEFAULT]: "Nemotron Super 120B",
};

export const MODEL_DESCRIPTIONS: Record<ModelId, string> = {
  [MODELS.DEFAULT]: "OpenRouter free tier",
};

export const MODEL_CAPABILITIES: Record<ModelId, { maxTokens: number; supportsStreaming: boolean }> = {
  [MODELS.DEFAULT]: { maxTokens: 8192, supportsStreaming: true },
};

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const MAX_RETRIES = 2;
export const RETRY_BASE_DELAY_MS = 1000;
