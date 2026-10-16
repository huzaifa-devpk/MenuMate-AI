import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config";

/** Error with an HTTP status and a stable machine-readable code. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (what: string) => new HttpError(404, "NOT_FOUND", `${what} not found`);
export const badRequest = (message: string, details?: unknown) => new HttpError(400, "BAD_REQUEST", message, details);
export const forbidden = (message: string) => new HttpError(403, "FORBIDDEN", message);
export const conflict = (message: string) => new HttpError(409, "CONFLICT", message);

/** Express error handler: consistent JSON envelope, no stack traces in production. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }
  // body-parser errors (malformed JSON / payload too large)
  const anyErr = err as { type?: string; status?: number; message?: string };
  if (anyErr?.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } });
    return;
  }
  if (anyErr?.type === "entity.too.large") {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } });
    return;
  }
  // SQLite constraint violations surface as 409s.
  if (anyErr?.message?.includes("SQLITE_CONSTRAINT")) {
    res.status(409).json({ error: { code: "CONFLICT", message: isProduction ? "Database constraint violated" : anyErr.message } });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction ? "Something went wrong" : (anyErr?.message ?? "Unknown error"),
    },
  });
}
