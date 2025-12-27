from __future__ import annotations

from typing import Any

from roset.http_client import HttpClient


class AuditResource:
    """Audit Log Access."""

    def __init__(self, http: HttpClient):
        self.http = http

    def query(
        self,
        actor_id: str | None = None,
        action: str | None = None,
        target_id: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        """Query audit logs."""
        params: dict[str, Any] = {"page": page, "pageSize": page_size}
        if actor_id:
            params["actorId"] = actor_id
        if action:
            params["action"] = action
        if target_id:
            params["targetId"] = target_id
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date

        return self.http.request("GET", "/v1/audit", params=params)
