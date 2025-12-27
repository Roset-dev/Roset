from __future__ import annotations

from typing import Any, Literal

from roset.http_client import HttpClient
from roset.models import Mount


class MountsResource:
    """Mount Management."""

    def __init__(self, http: HttpClient):
        self.http = http

    def list(self) -> list[Mount]:
        """List all mounts."""
        data = self.http.request("GET", "/v1/mounts")
        return [Mount.model_validate(item) for item in data.get("items", [])]

    def get(self, mount_id: str) -> Mount:
        """Get a mount by ID."""
        data = self.http.request("GET", f"/v1/mounts/{mount_id}")
        return Mount.model_validate(data["mount"])

    def create(
        self,
        name: str,
        provider: Literal["s3", "gcs", "azure", "r2", "minio"],
        config: dict[str, Any],
        read_only: bool = False,
    ) -> Mount:
        """Create a new mount."""
        data = self.http.request(
            "POST",
            "/v1/mounts",
            json={
                "name": name,
                "provider": provider,
                "config": config,
                "readOnly": read_only,
            },
        )
        return Mount.model_validate(data["mount"])

    def delete(self, mount_id: str) -> None:
        """Delete a mount."""
        self.http.request("DELETE", f"/v1/mounts/{mount_id}")
