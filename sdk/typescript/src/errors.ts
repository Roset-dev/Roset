/**
 * Error hierarchy for the Roset SDK.
 *
 * Every API error response is mapped to a typed subclass of {@link RosetError}
 * so callers can use `instanceof` checks or inspect the `.code` / `.statusCode`
 * properties for programmatic error handling.
 *
 * All errors carry optional `requestId` (from the `X-Request-Id` header) for
 * debugging and support, and a `retryable` flag indicating whether the request
 * is safe to retry.
 *
 * @module errors
 */

/**
 * Base error class for all Roset SDK errors.
 *
 * Extends the native `Error` with structured metadata from the API response:
 * a machine-readable `code`, the HTTP `statusCode`, optional `details` object,
 * `requestId` for tracing, and a `retryable` flag.
 *
 * All other SDK error classes extend this base.
 */
export class RosetError extends Error {
  /** Machine-readable error code (e.g. `"NOT_FOUND"`, `"RATE_LIMIT"`). */
  public readonly code: string;

  /** HTTP status code from the API response, or 0 for client-side errors. */
  public readonly statusCode: number;

  /** Additional structured error details (e.g. field-level validation errors). */
  public readonly details?: Record<string, unknown>;

  /** Request ID from the `X-Request-Id` response header, useful for support tickets. */
  public readonly requestId?: string;

  /** Whether this error is safe to retry (true for 429, 503, 504, 5xx). */
  public readonly retryable: boolean;

  /** Original error that caused this error, if any. */
  public readonly cause?: unknown;

  /**
   * @param message - Human-readable error description.
   * @param code - Machine-readable error code. Defaults to `"ROSET_ERROR"`.
   * @param statusCode - HTTP status code. Defaults to 500.
   * @param details - Optional structured details (e.g. validation field errors).
   * @param options - Additional options: `requestId`, `retryable`, and `cause`.
   */
  constructor(
    message: string,
    code: string = "ROSET_ERROR",
    statusCode: number = 500,
    details?: Record<string, unknown>,
    options?: { requestId?: string; retryable?: boolean; cause?: unknown }
  ) {
    super(message);
    this.name = "RosetError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.requestId = options?.requestId;
    this.retryable = options?.retryable ?? false;
    this.cause = options?.cause;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RosetError);
    }
  }
}

/**
 * Thrown when a requested resource does not exist (HTTP 404).
 *
 * Common causes: invalid file ID, deleted job, or mistyped resource identifier.
 */
export class NotFoundError extends RosetError {
  /**
   * @param resource - The type of resource that was not found (e.g. `"File"`, `"Job"`).
   * @param id - Optional identifier of the missing resource.
   */
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} '${id}' not found` : `${resource} not found`;
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when the caller lacks permission for the requested action (HTTP 403).
 *
 * Common causes: API key missing required scope, or accessing another
 * organization's resources.
 */
export class ForbiddenError extends RosetError {
  constructor(message: string = "Access denied") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

/**
 * Thrown when a resource already exists or a state conflict prevents the
 * operation (HTTP 409).
 *
 * Common causes: duplicate file upload with the same idempotency key, or
 * attempting to create a connection with a name that already exists.
 */
export class ConflictError extends RosetError {
  constructor(message: string = "Resource already exists") {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

/**
 * Thrown when the request payload fails validation (HTTP 400).
 *
 * The `details` property may contain field-level errors from Zod validation.
 */
export class ValidationError extends RosetError {
  /**
   * @param message - Description of what failed validation.
   * @param details - Optional field-level validation error details.
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Thrown when the API rate limit is exceeded (HTTP 429).
 *
 * The `retryAfter` property indicates how many seconds to wait before retrying.
 * This error is always retryable.
 */
export class RateLimitError extends RosetError {
  /** Number of seconds to wait before retrying the request. */
  public readonly retryAfter?: number;

  /**
   * @param message - Rate limit description.
   * @param retryAfter - Seconds to wait before retrying.
   * @param options - Additional options: `requestId`, `retryable`, `cause`.
   */
  constructor(
    message: string = "Rate limit exceeded",
    retryAfter?: number,
    options?: { requestId?: string; retryable?: boolean; cause?: unknown }
  ) {
    super(message, "RATE_LIMIT", 429, undefined, options);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when the organization's usage quota is exceeded (HTTP 402).
 *
 * Common causes: exceeding file count or storage limits on the current plan.
 * Upgrade the plan or contact support.
 */
export class QuotaExceededError extends RosetError {
  /**
   * @param message - Quota exceeded description.
   * @param details - Optional details about which quota was exceeded.
   */
  constructor(message: string = "Quota exceeded", details?: Record<string, unknown>) {
    super(message, "QUOTA_EXCEEDED", 402, details);
    this.name = "QuotaExceededError";
  }
}

/**
 * Thrown when the request lacks valid authentication credentials (HTTP 401).
 *
 * Common causes: missing or invalid API key, expired JWT, or revoked token.
 */
export class UnauthorizedError extends RosetError {
  constructor(message: string = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown when the API request times out (HTTP 504).
 *
 * This error is always retryable. Consider increasing the timeout or breaking
 * the operation into smaller requests.
 */
export class TimeoutError extends RosetError {
  constructor(message: string = "Request timeout") {
    super(message, "REQUEST_TIMEOUT", 504, undefined, { retryable: true });
    this.name = "TimeoutError";
  }
}

/**
 * Thrown when the Roset API is temporarily unavailable (HTTP 503).
 *
 * This error is always retryable. The `retryAfter` property may indicate how
 * long to wait before retrying.
 */
export class ServiceUnavailableError extends RosetError {
  /** Number of seconds to wait before retrying the request. */
  public readonly retryAfter?: number;

  /**
   * @param message - Service unavailable description.
   * @param retryAfter - Seconds to wait before retrying.
   * @param options - Additional options: `requestId`, `retryable`, `cause`.
   */
  constructor(
    message: string = "Service temporarily unavailable",
    retryAfter?: number,
    options?: { requestId?: string; retryable?: boolean; cause?: unknown }
  ) {
    super(message, "SERVICE_UNAVAILABLE", 503, undefined, { ...options, retryable: true });
    this.name = "ServiceUnavailableError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown for internal server errors (HTTP 500, 502, or other 5xx).
 *
 * This error is always retryable. If the problem persists, contact Roset
 * support with the `requestId`.
 */
export class ServerError extends RosetError {
  /**
   * @param message - Server error description.
   * @param statusCode - The specific 5xx status code. Defaults to 500.
   * @param options - Additional options: `requestId`, `retryable`, `cause`.
   */
  constructor(
    message: string = "Internal server error",
    statusCode: number = 500,
    options?: { requestId?: string; retryable?: boolean; cause?: unknown }
  ) {
    super(message, "INTERNAL_ERROR", statusCode, undefined, { ...options, retryable: true });
    this.name = "ServerError";
  }
}

/**
 * Thrown when the HTTP request fails at the network level (no response received).
 *
 * Common causes: DNS resolution failure, connection refused, or network timeout.
 * This error is always retryable.
 */
export class NetworkError extends RosetError {
  /**
   * @param message - Network error description.
   * @param cause - The underlying error (e.g. a `TypeError` from `fetch`).
   */
  constructor(message: string = "Network error", cause?: unknown) {
    super(message, "NETWORK_ERROR", 0, undefined, { retryable: true, cause });
    this.name = "NetworkError";
  }
}

/**
 * Parse an API error response into the appropriate typed SDK error class.
 *
 * This function maps HTTP status codes to specific error subclasses so that
 * callers can use `instanceof` checks for control flow:
 *
 * | Status | Error Class |
 * |--------|-------------|
 * | 400    | {@link ValidationError} |
 * | 401    | {@link UnauthorizedError} |
 * | 402    | {@link QuotaExceededError} |
 * | 403    | {@link ForbiddenError} |
 * | 404    | {@link NotFoundError} |
 * | 409    | {@link ConflictError} |
 * | 429    | {@link RateLimitError} or {@link QuotaExceededError} |
 * | 503    | {@link ServiceUnavailableError} |
 * | 504    | {@link TimeoutError} |
 * | 5xx    | {@link ServerError} |
 *
 * @param statusCode - HTTP status code from the API response.
 * @param body - Parsed JSON error body containing `error`, `code`, `details`,
 *               and optionally `retryAfter`.
 * @param options - Additional context such as `requestId` from response headers.
 * @returns A typed {@link RosetError} subclass instance.
 */
export function parseApiError(
  statusCode: number,
  body: { error?: string; code?: string; details?: Record<string, unknown>; retryAfter?: number },
  options?: { requestId?: string }
): RosetError {
  const message = body.error ?? "Unknown error";
  const code = body.code ?? "UNKNOWN";

  switch (statusCode) {
    case 400:
      return new ValidationError(message, body.details);
    case 401:
      return new UnauthorizedError(message);
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
      return new RateLimitError(message, body.retryAfter, { ...options, retryable: true });
    case 503:
      return new ServiceUnavailableError(message, body.retryAfter, { ...options, retryable: true });
    case 504:
      return new TimeoutError(message);
    case 500:
    case 502:
      return new ServerError(message, statusCode, { ...options, retryable: true });
    default:
      if (statusCode >= 500) {
        return new ServerError(message, statusCode, { ...options, retryable: true });
      }
      return new RosetError(message, code, statusCode, body.details, options);
  }
}
