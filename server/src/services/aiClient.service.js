import Anthropic from "@anthropic-ai/sdk";

export const MODEL_ALLOWLIST = new Set([
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5",
]);
export const DEFAULT_MODEL = "claude-opus-4-8";

/** Thrown for any AI-calling failure; `status` maps directly to the HTTP response. */
export class AiExtractionError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AiExtractionError";
    this.status = status;
  }
}

export function resolveModel(model) {
  return MODEL_ALLOWLIST.has(model) ? model : DEFAULT_MODEL;
}

// Caller-supplied keys/models are BYOK — a bad key or an over-quota account
// is a normal, expected failure mode here, not a bug, so every Anthropic
// exception is translated into a clean AiExtractionError with an HTTP status.
export function mapAnthropicError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return new AiExtractionError("Invalid Anthropic API key", 401);
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new AiExtractionError(
      "This API key doesn't have permission to use that model",
      403,
    );
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new AiExtractionError("Unknown model", 400);
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AiExtractionError(
      "Rate limited by Anthropic — try again shortly",
      429,
    );
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new AiExtractionError(
      err.message || "Bad request to Anthropic",
      400,
    );
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AiExtractionError("Could not reach the Anthropic API", 502);
  }
  if (err instanceof Anthropic.APIError) {
    return new AiExtractionError(err.message || "Anthropic API error", 502);
  }
  return new AiExtractionError("AI request failed", 502);
}
