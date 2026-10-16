export interface CompletionRequest {
  system: string;
  user: string;
  temperature: number;
  maxOutputTokens: number;
}

/**
 * Narrow interface so the Google Gemini API client and an OpenAI-compatible
 * endpoint can be swapped without touching menu code.
 */
export interface GemmaClient {
  provider: string;
  model: string;
  complete(request: CompletionRequest): Promise<string>;
}
