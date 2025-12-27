from __future__ import annotations

from typing import Any, Literal

from roset.http_client import HttpClient
from roset.models import Share


class SharesResource:
    """Share Management."""

    def __init__(self, http: HttpClient):
        self.http = http

    def create(
        self,
        node_id: str,
        role: Literal["viewer", "editor"] = "viewer",
        expires_at: str | None = None,
        scope: str | None = None,
        password: str | None = None,
        idempotency_key: str | None = None,
    ) -> Share:
        """Create a share link."""
        payload: dict[str, Any] = {"nodeId": node_id, "role": role}
        if expires_at:
            payload["expiresAt"] = expires_at
        if scope:
            payload["scope"] = scope
        if password:
            payload["password"] = password

        headers = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        data = self.http.request("POST", "/v1/shares", json=payload, headers=headers)
        return Share.model_validate(data["share"])

    def get(self, token: str) -> Share:
        """Get share details by token."""
        data = self.http.request("GET", f"/v1/shares/{token}")
        return Share.model_validate(data["share"])

    def revoke(self, token: str) -> None:
        """Revoke a share link."""
        self.http.request("DELETE", f"/v1/shares/{token}")
