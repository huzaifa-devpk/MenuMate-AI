import { config, type Env } from "../../config";
import { createGoogleClient } from "./google";
import { createOpenAiCompatibleClient } from "./openai";
import type { GemmaClient } from "./types";

export function createGemmaClient(env: Env = config, fetchImpl: typeof fetch = fetch): GemmaClient {
  if (env.GEMMA_PROVIDER === "openai-compatible") return createOpenAiCompatibleClient(env, fetchImpl);
  return createGoogleClient(env, fetchImpl);
}
