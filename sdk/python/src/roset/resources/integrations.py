from __future__ import annotations

from typing import Any

from roset.http_client import HttpClient
from roset.models import Integration


class IntegrationsResource:
    """Cloud Integrations Management."""

    def __init__(self, http: HttpClient):
        self.http = http

    def list(self) -> list[Integration]:
        """List active integrations."""
        data = self.http.request("GET", "/v1/integrations")
        return [Integration.model_validate(item) for item in data.get("integrations", [])]

    def connect(self, provider: str, config: dict[str, Any]) -> Integration:
        """Connect a new cloud provider."""
        data = self.http.request("POST", "/v1/integrations", json={"provider": provider, **config})
        return Integration.model_validate(data["integration"])

    def disconnect(self, integration_id: str) -> None:
        """Disconnect/Revoke an integration."""
        self.http.request("DELETE", f"/v1/integrations/{integration_id}")
