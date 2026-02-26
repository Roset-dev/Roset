"""Roset Python SDK -- Exception Hierarchy.

This module defines the structured exception hierarchy for the Roset SDK.
All exceptions inherit from :class:`RosetError`, which itself extends the
built-in :class:`Exception`.

The hierarchy is split into two branches:

1. **API errors** (:class:`RosetAPIError` and its subclasses) -- raised when
   the Roset API returns an HTTP error response (4xx or 5xx). Each subclass
   maps to a specific HTTP status code for clean ``try/except`` handling.

2. **Client-side errors** -- raised before a request is sent:
   - :class:`RosetValidationError` -- invalid arguments supplied by the caller.
   - :class:`RosetNetworkError` -- transport or connectivity failures after
     all retry attempts are exhausted.

Exception tree::

    RosetError (base)
    +-- RosetAPIError (HTTP 4xx/5xx)
    |   +-- RosetNotFoundError (404)
    |   +-- RosetConflictError (409)
    |   +-- RosetUnauthorizedError (401)
    |   +-- RosetForbiddenError (403)
    |   +-- RosetRateLimitError (429)
    |   +-- RosetQuotaExceededError (402/429)
    |   +-- RosetServerError (5xx)
    |   +-- RosetTimeoutError (504)
    |   +-- RosetServiceUnavailableError (503)
    +-- RosetValidationError (client-side)
    +-- RosetNetworkError (transport failures)
"""

from __future__ import annotations

from typing import Any


class RosetError(Exception):
    """Base exception for all Roset SDK errors.

    All exceptions raised by the SDK inherit from this class, so callers
    can use ``except RosetError`` as a catch-all for any Roset-related
    failure.
    """

    pass


class RosetAPIError(RosetError):
    """Error returned by the Roset API (HTTP 4xx or 5xx).

    This is the base class for all API-level errors. Subclasses map to
    specific HTTP status codes. Catch this class to handle any API error
    generically, or catch a specific subclass for fine-grained control.

    Attributes:
        status_code: The HTTP status code from the API response.
        code: A machine-readable error code string from the API
            (e.g. ``"NOT_FOUND"``, ``"RATE_LIMITED"``), or ``None``.
        details: An optional dict with additional error context from the
            API response body.
    """

    def __init__(
        self,
        message: str,
        status_code: int,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.details = details or {}

    def __str__(self) -> str:
        return f"[{self.status_code}] {self.code}: {super().__str__()}"


class RosetValidationError(RosetError):
    """Client-side validation error raised before a request is sent.

    Raised when the caller provides invalid arguments to an SDK method,
    such as uploading raw ``bytes`` without specifying a ``filename``, or
    passing an unsupported ``file`` type to :meth:`Client.upload`.
    """

    pass


class RosetNotFoundError(RosetAPIError):
    """The requested resource was not found (HTTP 404).

    Raised when the API returns a 404 for a file, job, space, connection,
    node, or webhook that does not exist or is not accessible within the
    current organization.

    Attributes:
        resource: A descriptive label for the resource type that was not
            found (included in the error message).
    """

    def __init__(self, resource: str):
        super().__init__(
            message=f"{resource} not found",
            status_code=404,
            code="NOT_FOUND",
        )


class RosetConflictError(RosetAPIError):
    """Conflict error (HTTP 409).

    Raised when the API detects a state conflict, such as attempting to
    cancel a job that has already completed, or retrying a job that is not
    in a ``failed`` state.
    """

    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=409,
            code="CONFLICT",
        )


class RosetUnauthorizedError(RosetAPIError):
    """Invalid or missing credentials (HTTP 401).

    Raised when the API key is missing, malformed, revoked, or otherwise
    fails authentication. Verify that your API key starts with ``rsk_``
    and has not been rotated.
    """

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            status_code=401,
            code="UNAUTHORIZED",
        )


class RosetForbiddenError(RosetAPIError):
    """Insufficient permissions (HTTP 403).

    Raised when the authenticated API key does not have permission to
    perform the requested operation (e.g. accessing another organization's
    resources).
    """

    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message,
            status_code=403,
            code="FORBIDDEN",
        )


class RosetRateLimitError(RosetAPIError):
    """Too many requests (HTTP 429).

    Raised after all automatic retry attempts for rate-limited requests
    have been exhausted. The SDK retries rate-limited requests with
    exponential backoff before raising this exception.

    Attributes:
        retry_after: Number of seconds the server suggests waiting before
            retrying, parsed from the ``Retry-After`` response header.
            ``None`` if the header was absent.
    """

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int | None = None):
        super().__init__(
            message=message,
            status_code=429,
            code="RATE_LIMITED",
        )
        self.retry_after = retry_after


class RosetServerError(RosetAPIError):
    """Internal server error (HTTP 5xx).

    Raised after all automatic retry attempts for server errors have been
    exhausted. Covers all 5xx status codes except 503 and 504, which have
    their own subclasses.

    Attributes:
        status_code: The specific 5xx status code (e.g. 500, 502).
    """

    def __init__(self, message: str = "Server error", status_code: int = 500):
        super().__init__(
            message=message,
            status_code=status_code,
            code="SERVER_ERROR",
        )


class RosetTimeoutError(RosetAPIError):
    """Gateway timeout (HTTP 504).

    Raised when the API gateway times out waiting for the upstream service.
    This typically indicates that a long-running operation exceeded the
    server-side timeout. Unlike client-side ``httpx`` timeouts (which
    surface as :class:`RosetNetworkError`), this represents a server-side
    timeout response.
    """

    def __init__(self, message: str = "Request timeout"):
        super().__init__(
            message=message,
            status_code=504,
            code="REQUEST_TIMEOUT",
        )


class RosetServiceUnavailableError(RosetAPIError):
    """Service temporarily unavailable (HTTP 503).

    Raised after all automatic retry attempts for 503 responses have been
    exhausted. Typically indicates temporary maintenance or capacity issues.

    Attributes:
        retry_after: Number of seconds the server suggests waiting before
            retrying, parsed from the ``Retry-After`` response header.
            ``None`` if the header was absent.
    """

    def __init__(self, message: str = "Service temporarily unavailable", retry_after: int | None = None):
        super().__init__(
            message=message,
            status_code=503,
            code="SERVICE_UNAVAILABLE",
        )
        self.retry_after = retry_after


class RosetNetworkError(RosetError):
    """Network or transport-level failure.

    Raised when the HTTP client cannot reach the Roset API after all retry
    attempts. This covers DNS resolution failures, connection refused,
    TLS errors, and client-side timeouts (as opposed to server-side 504
    gateway timeouts).

    Attributes:
        cause: The underlying transport exception (e.g. an
            ``httpx.TransportError`` instance), or ``None``.
    """

    def __init__(self, message: str = "Network error", cause: Exception | None = None):
        super().__init__(message)
        self.cause = cause


class RosetQuotaExceededError(RosetAPIError):
    """Usage quota exceeded (HTTP 402 or 429).

    Raised when the organization has reached its plan limits (e.g. file
    count, storage, or processing quotas). Distinct from
    :class:`RosetRateLimitError`, which indicates per-second request
    throttling rather than plan-level limits.

    Attributes:
        status_code: Either 402 (Payment Required) or 429, depending on
            how the API signals quota exhaustion.
    """

    def __init__(self, message: str = "Quota exceeded", status_code: int = 402):
        super().__init__(
            message=message,
            status_code=status_code,
            code="QUOTA_EXCEEDED",
        )
