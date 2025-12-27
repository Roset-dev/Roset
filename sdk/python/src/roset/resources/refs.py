from __future__ import annotations

from roset.exceptions import RosetNotFoundError
from roset.http_client import HttpClient
from roset.models import Ref


class RefsResource:
    """Symbolic references (tags)."""

    def __init__(self, http: HttpClient):
        self.http = http

    def get(self, name: str) -> Ref | None:
        """Get a ref by name. Returns None if not found."""
        try:
            data = self.http.request("GET", f"/v1/refs/{name}")
            return Ref.model_validate(data["ref"])
        except RosetNotFoundError:
            return None

    def update(
        self,
        name: str,
        commit_id: str,
        expected_commit_id: str | None = None,
    ) -> Ref:
        """Update or create a ref."""
        data = self.http.request(
            "PUT",
            f"/v1/refs/{name}",
            json={
                "commit_id": commit_id,
                **({"expected_commit_id": expected_commit_id} if expected_commit_id else {}),
            },
        )
        return Ref.model_validate(data["ref"])

    def delete(self, name: str) -> None:
        """Delete a ref."""
        self.http.request("DELETE", f"/v1/refs/{name}")
