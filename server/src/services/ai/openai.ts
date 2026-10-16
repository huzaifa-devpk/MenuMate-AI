import type { Env } from "../../config";
import { AiNotConfiguredError, AiProviderError, redactSecret } from "./errors";
import type { GemmaClient } from "./types";

/**
 * OpenAI-style /chat/completions endpoint for a self-hosted or third-party Gemma server.
 * The caller sets GEMMA_API_BASE_URL (for example http://localhost:11434/v1) and GEMMA_MODEL.
 */
export function openAiChatUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

export function createOpenAiCompatibleClient(env: Env, fetchImpl: typeof fetch = fetch): GemmaClient {
  return {
    provider: "openai-compatible",
    model: env.GEMMA_MODEL,
    async complete(request) {
      if (!env.GEMMA_API_KEY) throw new AiNotConfiguredError();
      const url = openAiChatUrl(env.GEMMA_API_BASE_URL);
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.GEMMA_API_KEY}`,
          },
          body: JSON.stringify({
            model: env.GEMMA_MODEL,
            temperature: request.temperature,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.user },
            ],
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(env.GEMMA_TIMEOUT_MS),
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "network error";
        throw new AiProviderError(redactSecret(`Could not reach the Gemma provider (${reason}). Nothing was changed.`, env.GEMMA_API_KEY));
      }

      const raw = await response.text();
      let payload: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }
      if (!response.ok) {
        const summary = payload?.error?.message || `HTTP ${response.status}`;
        throw new AiProviderError(redactSecret(`Gemma request failed (${summary}). Nothing was changed.`, env.GEMMA_API_KEY));
      }
      const text = payload?.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) throw new AiProviderError("The Gemma provider returned an empty completion. Nothing was saved.");
      return text;
    },
  };
}
