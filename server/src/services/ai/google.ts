import type { Env } from "../../config";
import { AiInvalidResponseError, AiNotConfiguredError, AiProviderError, redactSecret } from "./errors";
import type { CompletionRequest, GemmaClient } from "./types";

/**
 * Gemini API hosting Gemma open-weight models.
 * Docs (checked 2026-10-16): https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api
 *
 * Supported model IDs: gemma-4-31b-it, gemma-4-26b-a4b-it
 * Endpoint: POST {base}/models/{model}:generateContent
 * Auth: x-goog-api-key header (https://ai.google.dev/gemini-api/docs/api-key)
 * Thinking: generationConfig.thinkingConfig.thinkingLevel "minimal" | "high"
 *
 * Gemma's own guide does not document a response schema, so we request JSON
 * and validate it with Zod. responseSchema is intentionally not sent.
 */
export function googleGenerateUrl(baseUrl: string, model: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/models/${encodeURIComponent(model)}:generateContent`;
}

export interface GoogleCall {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export function buildGoogleCall(env: Pick<Env, "GEMMA_API_KEY" | "GEMMA_API_BASE_URL" | "GEMMA_MODEL" | "GEMMA_THINKING_LEVEL">, request: CompletionRequest): GoogleCall {
  return {
    url: googleGenerateUrl(env.GEMMA_API_BASE_URL, env.GEMMA_MODEL),
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMMA_API_KEY,
    },
    body: {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: "user", parts: [{ text: request.user }] }],
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: env.GEMMA_THINKING_LEVEL },
      },
    },
  };
}

interface GooglePart {
  text?: string;
  thought?: boolean;
}

interface GoogleResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: GooglePart[] };
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

/** Read the model's visible text, skipping Gemma thinking parts. */
export function parseGoogleResponse(payload: unknown, secret = ""): string {
  if (!payload || typeof payload !== "object") {
    throw new AiInvalidResponseError("The Gemma provider returned an empty response. Nothing was saved.");
  }
  const body = payload as GoogleResponse;
  if (body.error?.message) {
    throw new AiProviderError(redactSecret(`Gemma refused the request: ${body.error.message}`, secret));
  }
  if (body.promptFeedback?.blockReason) {
    throw new AiProviderError(`Gemma declined the request (${body.promptFeedback.blockReason}). Nothing was changed.`);
  }
  const candidate = body.candidates?.[0];
  if (!candidate) {
    throw new AiInvalidResponseError("Gemma returned no candidates. Nothing was saved.");
  }
  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new AiInvalidResponseError(`Gemma stopped early (${candidate.finishReason}). Nothing was saved. Try again or edit the text yourself.`);
  }
  const text = (candidate.content?.parts ?? [])
    .filter((part) => part.thought !== true && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
  if (!text) {
    throw new AiInvalidResponseError("Gemma returned no text. Nothing was saved.");
  }
  return text;
}

export function createGoogleClient(env: Env, fetchImpl: typeof fetch = fetch): GemmaClient {
  return {
    provider: "google",
    model: env.GEMMA_MODEL,
    async complete(request) {
      if (!env.GEMMA_API_KEY) throw new AiNotConfiguredError();
      const call = buildGoogleCall(env, request);
      let response: Response;
      try {
        response = await fetchImpl(call.url, {
          method: "POST",
          headers: call.headers,
          body: JSON.stringify(call.body),
          signal: AbortSignal.timeout(env.GEMMA_TIMEOUT_MS),
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "network error";
        throw new AiProviderError(redactSecret(`Could not reach the Gemma provider (${reason}). Nothing was changed.`, env.GEMMA_API_KEY));
      }

      const raw = await response.text();
      let payload: unknown = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = null;
        }
      }
      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object" && "message" in payload.error
            ? String((payload.error as { message?: unknown }).message ?? "")
            : "";
        const summary = message || `HTTP ${response.status}`;
        throw new AiProviderError(redactSecret(`Gemma request failed (${summary}). Nothing was changed. Check the API key and model id.`, env.GEMMA_API_KEY));
      }
      return parseGoogleResponse(payload, env.GEMMA_API_KEY);
    },
  };
}
