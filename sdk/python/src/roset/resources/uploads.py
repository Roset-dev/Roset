from __future__ import annotations

from typing import Any, Literal

from roset.http_client import HttpClient


class UploadsResource:
    """File Uploads & Downloads."""

    def __init__(self, http: HttpClient):
        self.http = http

    def get_signed_url(
        self,
        node_id: str,
        operation: Literal["read", "write"] = "read",
        expires_in: int = 3600,
    ) -> str:
        """Get a signed URL for reading or writing a file."""
        data = self.http.request(
            "POST",
            "/v1/uploads/signed-url",
            json={
                "nodeId": node_id,
                "operation": operation,
                "expiresIn": expires_in,
            },
        )
        return str(data["url"])

    def complete(self, upload_id: str, parts: list[dict[str, Any]]) -> None:
        """Complete a multipart upload."""
        self.http.request(
            "POST",
            f"/v1/uploads/{upload_id}/complete",
            json={"parts": parts},
        )
