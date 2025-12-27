from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from roset.exceptions import RosetAPIError, RosetNotFoundError

logger = logging.getLogger(__name__)


class HttpClient:
    """Shared HTTP client with retries and error handling."""

    def __init__(
        self,
        api_url: str,
        api_key: str,
        mount_id: str | None = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        backoff_factor: float = 0.5,
    ):
        self.api_url = api_url.rstrip("/")
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.mount_id = mount_id

        self._client = httpx.Client(
            base_url=self.api_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                **({"X-Mount-Id": mount_id} if mount_id else {}),
            },
            timeout=timeout,
        )

    def close(self) -> None:
        self._client.close()

    def request(
        self,
        method: str,
        path: str,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Make an API request and handle errors with retries."""
        for attempt in range(self.max_retries + 1):
            try:
                response = self._client.request(
                    method, path, json=json, params=params, headers=headers
                )

                if response.status_code == 404:
                    raise RosetNotFoundError("Resource")

                if response.status_code >= 400:
                    # Don't retry client errors (except strict 429 if we wanted)
                    if response.status_code < 500 and response.status_code != 429:
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

                    # For 5xx or 429, raise to trigger retry
                    response.raise_for_status()

                if response.status_code == 204:
                    return {}

                return dict(response.json())

            except (httpx.TransportError, httpx.HTTPStatusError) as e:
                # Retry on transport errors or 5xx/429
                if attempt == self.max_retries:
                    if isinstance(e, httpx.HTTPStatusError):
                        try:
                            data = e.response.json()
                            raise RosetAPIError(
                                message=data.get("error", str(e)),
                                status_code=e.response.status_code,
                                code=data.get("code"),
                                details=data.get("details"),
                            ) from e
                        except Exception:
                            pass
                    raise RosetAPIError(
                        message=f"Request failed after {self.max_retries} retries: {e!s}",
                        status_code=503,
                        code="NETWORK_ERROR",
                    ) from e

                sleep_time = self.backoff_factor * (2**attempt)
                logger.warning(
                    f"Request failed (attempt {attempt + 1}/{self.max_retries}), "
                    f"retrying in {sleep_time:.2f}s: {e}"
                )
                time.sleep(sleep_time)

        return {}
