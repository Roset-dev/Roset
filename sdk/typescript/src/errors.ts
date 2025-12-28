/**
 * SDK Error Classes
 */

export class RosetError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "ROSET_ERROR",
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RosetError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RosetError);
    }
  }
}

export class NotFoundError extends RosetError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} '${id}' not found` : `${resource} not found`;
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends RosetError {
  constructor(message: string = "Access denied") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends RosetError {
  constructor(message: string = "Resource already exists") {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

export class ValidationError extends RosetError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends RosetError {
  public readonly retryAfter?: number;

  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, "RATE_LIMIT", 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class QuotaExceededError extends RosetError {
  constructor(message: string = "Quota exceeded", details?: Record<string, unknown>) {
    super(message, "QUOTA_EXCEEDED", 402, details);
    this.name = "QuotaExceededError";
  }
}

/**
 * Parse API error response into appropriate error class
 */
export function parseApiError(
  statusCode: number,
  body: { error?: string; code?: string; details?: Record<string, unknown> }
): RosetError {
  const message = body.error ?? "Unknown error";
  const code = body.code ?? "UNKNOWN";

  switch (statusCode) {
    case 400:
      return new ValidationError(message, body.details);
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 402:
      return new QuotaExceededError(message, body.details);
    case 429:
      if (body.code === "QUOTA_EXCEEDED") {
        return new QuotaExceededError(message, body.details);
      }
      return new RateLimitError(message);
    default:
      return new RosetError(message, code, statusCode, body.details);
  }
}
