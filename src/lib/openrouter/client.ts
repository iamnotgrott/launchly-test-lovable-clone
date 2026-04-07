import { MODELS, MODEL_CAPABILITIES, OPENROUTER_API_URL, MAX_RETRIES, RETRY_BASE_DELAY_MS, ModelId } from "./config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  model?: ModelId;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onResponse?: (response: Response) => void;
  apiKey?: string;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: OpenRouterUsage;
}

function getApiKey(providedKey?: string): string {
  if (providedKey && providedKey.trim()) return providedKey.trim();
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set. Add it in Settings or your .env.local file.");
  return key;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<{ content: string; model: string; usage?: OpenRouterUsage }> {
  const model = options.model || MODELS.DEFAULT;
  const maxTokens = options.maxTokens || MODEL_CAPABILITIES[model].maxTokens;
  const apiKey = getApiKey(options.apiKey);

  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: maxTokens,
  };

  let lastError: Error | null = null;
  const modelsToTry = [model, MODELS.FALLBACK].filter((m, i, arr) => arr.indexOf(m) === i);

  for (const tryModel of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await sleep(delay);
        }

        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Forge AI App Builder",
          },
          body: JSON.stringify({ ...body, model: tryModel }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
        }

        const data: OpenRouterResponse = await response.json();
        return {
          content: data.choices[0]?.message?.content || "",
          model: data.model,
          usage: data.usage,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Attempt ${attempt + 1} with model ${tryModel} failed:`, lastError.message);
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

export async function* streamChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): AsyncIterable<{ content: string; model: string; done: boolean; usage?: OpenRouterUsage }> {
  const model = options.model || MODELS.DEFAULT;
  const maxTokens = options.maxTokens || MODEL_CAPABILITIES[model].maxTokens;
  const apiKey = getApiKey(options.apiKey);

  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: maxTokens,
    stream: true,
  };

  const modelsToTry = [model, MODELS.FALLBACK].filter((m, i, arr) => arr.indexOf(m) === i);

  for (const tryModel of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await sleep(delay);
        }

        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Forge AI App Builder",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ ...body, model: tryModel }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                yield { content: delta, model: json.model || tryModel, done: false };
              }
            } catch {
              // skip malformed SSE events
            }
          }
        }

        yield { content: "", model: tryModel, done: true };
        return;
      } catch (error) {
        console.warn(`Stream attempt ${attempt + 1} with model ${tryModel} failed:`, error);
      }
    }
  }

  throw new Error("All streaming retry attempts failed");
}
