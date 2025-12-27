from __future__ import annotations

from typing import Any

from roset.http_client import HttpClient
from roset.models import Webhook, WebhookDelivery


class WebhooksResource:
    """Webhook Management."""

    def __init__(self, http: HttpClient):
        self.http = http

    def list(self) -> list[Webhook]:
        """List all webhooks."""
        data = self.http.request("GET", "/v1/webhooks")
        return [Webhook.model_validate(item) for item in data.get("items", [])]

    def get(self, webhook_id: str) -> Webhook:
        """Get a webhook by ID."""
        data = self.http.request("GET", f"/v1/webhooks/{webhook_id}")
        return Webhook.model_validate(data["webhook"])

    def create(
        self,
        url: str,
        events: list[str],
        secret: str | None = None,
        description: str | None = None,
        enabled: bool = True,
    ) -> Webhook:
        """Create a new webhook."""
        data = self.http.request(
            "POST",
            "/v1/webhooks",
            json={
                "url": url,
                "events": events,
                "secret": secret,
                "description": description,
                "enabled": enabled,
            },
        )
        return Webhook.model_validate(data["webhook"])

    def update(
        self,
        webhook_id: str,
        url: str | None = None,
        events: list[str] | None = None,
        secret: str | None = None,
        description: str | None = None,
        enabled: bool | None = None,
    ) -> Webhook:
        """Update a webhook."""
        payload: dict[str, Any] = {}
        if url is not None:
            payload["url"] = url
        if events is not None:
            payload["events"] = events
        if secret is not None:
            payload["secret"] = secret
        if description is not None:
            payload["description"] = description
        if enabled is not None:
            payload["enabled"] = enabled

        data = self.http.request(
            "PATCH", f"/v1/webhooks/{webhook_id}", json=payload
        )
        return Webhook.model_validate(data["webhook"])

    def delete(self, webhook_id: str) -> None:
        """Delete a webhook."""
        self.http.request("DELETE", f"/v1/webhooks/{webhook_id}")

    def test(self, webhook_id: str) -> WebhookDelivery:
        """Test a webhook by sending a dummy event."""
        data = self.http.request("POST", f"/v1/webhooks/{webhook_id}/test", json={})
        return WebhookDelivery.model_validate(data["delivery"])

    def list_deliveries(
        self, webhook_id: str, page: int = 1, page_size: int = 20
    ) -> dict[str, Any]:
        """List recent deliveries. Returns paginated result dict."""
        data = self.http.request(
            "GET",
            f"/v1/webhooks/{webhook_id}/deliveries",
            params={"page": page, "page_size": page_size},
        )
        # Note: In TS this returns PaginatedResult<WebhookDelivery>.
        # Here we return the raw dict wrapper but validate items if needed
        # For parity with other lists, we might want a PaginatedResult model.
        # But existing org.list_members returns list[Member].
        # Let's keep it raw dict for pagination metadata for now, or match TS strictly.
        # Python SDK seems to generally return list[T] and hide pagination or return raw.
        # Given the explicit page params, returning the raw paginated structure 
        # (items, total, has_more) is best.
        return data

    def retry_delivery(
        self, webhook_id: str, delivery_id: str
    ) -> WebhookDelivery:
        """Retry a failed delivery."""
        data = self.http.request(
            "POST",
            f"/v1/webhooks/{webhook_id}/deliveries/{delivery_id}/retry",
            json={},
        )
        return WebhookDelivery.model_validate(data["delivery"])
