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
  onHeartbeat?: () => void;
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

const FETCH_TIMEOUT_MS = 30000;
const STREAM_READ_TIMEOUT_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 3000;

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
  const modelsToTry = [model];

  for (const tryModel of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[OpenRouter] Retry ${attempt} for ${tryModel}, waiting ${delay}ms`);
          await sleep(delay);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Forge AI App Builder",
          },
          body: JSON.stringify({ ...body, model: tryModel }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 429) {
            const retryAfter = response.headers.get("retry-after");
            const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
            console.warn(`[OpenRouter] Rate limited. Waiting ${waitMs}ms...`);
            await sleep(waitMs);
            continue;
          }
          throw new Error(`OpenRouter API error (${response.status}): ${errorText.slice(0, 300)}`);
        }

        const data: OpenRouterResponse = await response.json();
        const content = data.choices[0]?.message?.content || "";
        console.log(`[OpenRouter] ${tryModel} returned ${content.length} chars`);
        return {
          content,
          model: data.model,
          usage: data.usage,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[OpenRouter] Attempt ${attempt + 1} with ${tryModel} failed:`, lastError.message);
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
  const onHeartbeat = options.onHeartbeat;

  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: maxTokens,
    stream: true,
  };

  const modelsToTry = [model];

  for (const tryModel of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[OpenRouter] Stream retry ${attempt} for ${tryModel}, waiting ${delay}ms`);
          await sleep(delay);
        }

        const controller = new AbortController();
        const fetchTimeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        console.log(`[OpenRouter] Streaming with ${tryModel}...`);

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
          signal: controller.signal,
        });
        clearTimeout(fetchTimeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 429) {
            const retryAfter = response.headers.get("retry-after");
            const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
            console.warn(`[OpenRouter] Rate limited. Waiting ${waitMs}ms...`);
            await sleep(waitMs);
            continue;
          }
          throw new Error(`OpenRouter API error (${response.status}): ${errorText.slice(0, 300)}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let heartbeatInterval: NodeJS.Timeout | null = null;

        if (onHeartbeat) {
          heartbeatInterval = setInterval(onHeartbeat, HEARTBEAT_INTERVAL_MS);
        }

        try {
          while (true) {
            const readPromise = reader.read();
            const timeoutPromise = new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
              setTimeout(() => reject(new Error(`Stream read timeout after ${STREAM_READ_TIMEOUT_MS / 1000}s`)), STREAM_READ_TIMEOUT_MS);
            });

            const { done, value } = await Promise.race([readPromise, timeoutPromise]);

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

                if (json.error) {
                  throw new Error(`OpenRouter error: ${json.error.message || JSON.stringify(json.error)}`);
                }

                const delta = json.choices?.[0]?.delta?.content || "";
                if (delta) {
                  yield { content: delta, model: json.model || tryModel, done: false };
                }

                if (json.choices?.[0]?.finish_reason) {
                  yield { content: "", model: json.model || tryModel, done: true };
                  return;
                }
              } catch (parseError) {
                if (parseError instanceof Error && parseError.message.startsWith("OpenRouter error")) {
                  throw parseError;
                }
              }
            }
          }
        } finally {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }

        yield { content: "", model: tryModel, done: true };
        return;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[OpenRouter] Stream attempt ${attempt + 1} with ${tryModel} failed: ${errMsg}`);
      }
    }
  }

  throw new Error("All streaming retry attempts failed");
}
