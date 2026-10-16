import { HttpError } from "../../lib/errors";

export class AiNotConfiguredError extends HttpError {
  constructor() {
    super(
      503,
      "AI_NOT_CONFIGURED",
      "Gemma is not configured. Set GEMMA_API_KEY in the server environment and restart. Nothing was generated.",
    );
  }
}

export class AiInvalidResponseError extends HttpError {
  constructor(message = "The model response was not usable JSON. Nothing was saved. Retry, or edit the text yourself.") {
    super(502, "AI_INVALID_RESPONSE", message);
  }
}

export class AiProviderError extends HttpError {
  constructor(message: string) {
    super(502, "AI_PROVIDER_ERROR", message);
  }
}

export function redactSecret(message: string, secret: string): string {
  if (!secret) return message;
  return message.split(secret).join("[redacted]");
}
