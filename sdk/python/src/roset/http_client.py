"""Roset Python SDK -- HTTP Transport Layer.

This module provides the low-level :class:`HttpClient` that handles all
communication with the Roset API. It is responsible for:

* Sending authenticated HTTP requests (API key in the ``Authorization`` header).
* Automatic retries with exponential backoff for transient failures (rate
  limits, 5xx server errors, and network/transport errors).
* Mapping HTTP error responses to the structured exception hierarchy defined
  in :mod:`roset.exceptions`.

This class is an internal implementation detail. SDK users should interact
with the :class:`roset.Client` class instead, which exposes a high-level,
resource-oriented interface built on top of ``HttpClient``.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from roset.exceptions import (
    RosetAPIError,
    RosetForbiddenError,
    RosetNetworkError,
    RosetNotFoundError,
    RosetRateLimitError,
    RosetServerError,
    RosetServiceUnavailableError,
    RosetTimeoutError,
    RosetUnauthorizedError,
)

logger = logging.getLogger(__name__)


class HttpClient:
    """Low-level HTTP client for the Roset API with retries and error mapping.

    Wraps :class:`httpx.Client` to provide:

    * **Authentication** -- Sends the API key as ``Authorization: ApiKey rsk_...``
      on every request.
    * **Automatic retries** -- Retries on rate-limit (429), server errors (5xx),
      and network/transport failures using exponential backoff.
    * **Error mapping** -- Translates HTTP status codes into typed
      :class:`~roset.exceptions.RosetAPIError` subclasses for clean
      ``try/except`` handling in calling code.
    * **None-stripping** -- Removes ``None`` values from query parameters so
      callers can pass optional filters without pre-filtering.

    This class is internal to the SDK. Use :class:`roset.Client` for the
    public API.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.roset.dev",
        timeout: float = 30.0,
        max_retries: int = 3,
        backoff_factor: float = 0.5,
    ):
        """Initialize the HTTP transport.

        Args:
            api_key: Roset API key (prefixed with ``rsk_``). Sent in the
                ``Authorization`` header as ``ApiKey <key>``.
            base_url: Base URL for the Roset API. Trailing slashes are
                stripped automatically.
            timeout: HTTP request timeout in seconds.
            max_retries: Maximum number of retry attempts for transient
                errors. The first request is not counted as a retry, so
                the total attempts are ``max_retries + 1``.
            backoff_factor: Multiplier for exponential backoff between
                retries. The sleep duration is
                ``backoff_factor * 2^attempt`` seconds.
        """
        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor

        self._client = httpx.Client(
            base_url=self.base_url,
            headers={
                "Authorization": f"ApiKey {api_key}",
                "User-Agent": "roset-python/0.2.0",
            },
            timeout=timeout,
        )

    def close(self) -> None:
        """Close the underlying ``httpx.Client`` and release connection pool resources."""
        self._client.close()

    def request(
        self,
        method: str,
        path: str,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        content: bytes | None = None,
        files: Any | None = None,
    ) -> dict[str, Any]:
        """Send an HTTP request to the Roset API with automatic retries.

        Handles the full request lifecycle: strips ``None`` params, sends
        the request, maps error responses to typed exceptions, and retries
        on transient failures with exponential backoff.

        Args:
            method: HTTP method (``"GET"``, ``"POST"``, ``"PATCH"``,
                ``"DELETE"``).
            path: API path relative to the base URL (e.g. ``"/v1/files"``).
            json: JSON-serializable request body for ``POST``/``PATCH``
                requests.
            params: Query string parameters. ``None`` values are
                automatically stripped before sending.
            headers: Additional HTTP headers to merge into the request.
            content: Raw bytes body (mutually exclusive with ``json``).
            files: Multipart file upload data in the format accepted by
                ``httpx`` (e.g. ``{"file": (name, bytes, mime)}``).

        Returns:
            Parsed JSON response body as a ``dict``. Returns an empty dict
            for ``204 No Content`` responses.

        Raises:
            RosetUnauthorizedError: On 401 responses (invalid/missing API key).
            RosetForbiddenError: On 403 responses (insufficient permissions).
            RosetNotFoundError: On 404 responses.
            RosetRateLimitError: On 429 responses (after exhausting retries).
            RosetServiceUnavailableError: On 503 responses (after retries).
            RosetTimeoutError: On 504 responses.
            RosetServerError: On other 5xx responses (after retries).
            RosetAPIError: On other 4xx responses.
            RosetNetworkError: On transport/connection failures (after retries).
        """
        # Filter out None values from params
        if params:
            params = {k: v for k, v in params.items() if v is not None}

        for attempt in range(self.max_retries + 1):
            try:
                response = self._client.request(
                    method,
                    path,
                    json=json,
                    params=params,
                    headers=headers,
                    content=content,
                    files=files,
                )

                if response.status_code == 401:
                    raise RosetUnauthorizedError(self._parse_error(response))

                if response.status_code == 403:
                    raise RosetForbiddenError(self._parse_error(response))

                if response.status_code == 404:
                    raise RosetNotFoundError("Resource")

                if response.status_code == 429:
                    retry_after = self._parse_retry_after(
                        response.headers.get("Retry-After")
                    )
                    raise RosetRateLimitError(
                        self._parse_error(response), retry_after=retry_after
                    )

                if response.status_code == 503:
                    retry_after = self._parse_retry_after(
                        response.headers.get("Retry-After")
                    )
                    raise RosetServiceUnavailableError(
                        self._parse_error(response), retry_after=retry_after
                    )

                if response.status_code == 504:
                    raise RosetTimeoutError(self._parse_error(response))

                if response.status_code >= 500:
                    raise RosetServerError(
                        self._parse_error(response),
                        status_code=response.status_code,
                    )

                if response.status_code >= 400:
                    try:
                        data = response.json()
                        raise RosetAPIError(
                            message=data.get("error", "Unknown error"),
                            status_code=response.status_code,
                            code=data.get("code"),
                            details=data.get("details"),
                        )
                    except ValueError:
                        response.raise_for_status()

                if response.status_code == 204:
                    return {}

                return dict(response.json())

            except RosetRateLimitError as e:
                if attempt < self.max_retries:
                    sleep_time = e.retry_after or (self.backoff_factor * (2**attempt))
                    logger.warning(
                        f"Rate limited (attempt {attempt + 1}/{self.max_retries + 1}), "
                        f"retrying in {sleep_time:.1f}s"
                    )
                    time.sleep(sleep_time)
                    continue
                raise

            except (RosetServiceUnavailableError, RosetServerError) as e:
                if attempt < self.max_retries:
                    retry_after = getattr(e, "retry_after", None)
                    sleep_time = retry_after or (self.backoff_factor * (2**attempt))
                    logger.warning(
                        f"Server error (attempt {attempt + 1}/{self.max_retries + 1}), "
                        f"retrying in {sleep_time:.1f}s"
                    )
                    time.sleep(sleep_time)
                    continue
                raise

            except httpx.TransportError as e:
                if attempt < self.max_retries:
                    sleep_time = self.backoff_factor * (2**attempt)
                    logger.warning(
                        f"Transport error (attempt {attempt + 1}/{self.max_retries + 1}), "
                        f"retrying in {sleep_time:.1f}s: {e}"
                    )
                    time.sleep(sleep_time)
                    continue
                raise RosetNetworkError(
                    message=f"Request failed after {self.max_retries} retries: {e!s}",
                    cause=e,
                ) from e

        return {}

    @staticmethod
    def _parse_retry_after(value: str | None) -> int | None:
        """Parse the ``Retry-After`` response header as an integer.

        Args:
            value: Raw header value, or ``None`` if the header is absent.

        Returns:
            The parsed number of seconds to wait before retrying, or ``None``
            if the header is missing or not a valid integer.
        """
        if not value:
            return None
        try:
            return int(value)
        except ValueError:
            return None

    @staticmethod
    def _parse_error(response: httpx.Response) -> str:
        """Extract a human-readable error message from an API error response.

        Attempts to parse the response body as JSON and looks for ``error``
        or ``message`` fields. Falls back to a generic ``"HTTP <status>"``
        string if the body is not valid JSON.

        Args:
            response: The ``httpx.Response`` object from a failed request.

        Returns:
            A string error message suitable for use in exception messages.
        """
        try:
            data = response.json()
            return data.get("error") or data.get("message") or "Unknown error"
        except ValueError:
            return f"HTTP {response.status_code}"
