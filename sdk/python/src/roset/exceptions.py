"""
Roset Exceptions

Standard exception hierarchy for the SDK.
"""

from __future__ import annotations

from typing import Any


class RosetError(Exception):
    """Base exception for all Roset errors."""

    pass


class RosetAPIError(RosetError):
    """Error returned by the Roset API."""

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
    """Client-side validation error."""

    pass


class RosetNotFoundError(RosetAPIError):
    """Resource not found (404)."""

    def __init__(self, resource: str):
        super().__init__(
            message=f"{resource} not found",
            status_code=404,
            code="NOT_FOUND",
        )


class RosetConflictError(RosetAPIError):
    """Conflict error (409) - e.g., CAS failure."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=409,
            code="CONFLICT",
        )
