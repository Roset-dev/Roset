from __future__ import annotations

import time
from typing import Any

from roset.exceptions import RosetAPIError
from roset.http_client import HttpClient
from roset.models import Commit, CommitGroup, CompareResult


class CommitsResource:
    """ML Checkpoints and Version Control."""

    def __init__(self, http: HttpClient):
        self.http = http

    def create(
        self,
        node_id: str,
        message: str | None = None,
        group_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Commit:
        """Create a checkpoint."""
        payload: dict[str, Any] = {"node_id": node_id}
        if message:
            payload["message"] = message
        if group_id:
            payload["group_id"] = group_id
        if metadata:
            payload["metadata"] = metadata

        data = self.http.request("POST", "/v1/commits", json=payload)
        return Commit.model_validate(data["commit"])

    def get(self, commit_id: str) -> Commit:
        """Get a commit by ID."""
        data = self.http.request("GET", f"/v1/commits/{commit_id}")
        return Commit.model_validate(data["commit"])

    def wait_for(
        self,
        commit_id: str,
        timeout: float = 60.0,
        poll_interval: float = 0.5,
    ) -> Commit:
        """Wait for a commit to complete."""
        start = time.time()
        while time.time() - start < timeout:
            commit = self.get(commit_id)
            if commit.status == "completed":
                return commit
            if commit.status == "failed":
                raise RosetAPIError(
                    message="Commit failed",
                    status_code=500,
                    code="COMMIT_FAILED",
                )
            time.sleep(poll_interval)

        raise RosetAPIError(
            message=f"Commit timed out after {timeout}s",
            status_code=408,
            code="TIMEOUT",
        )

    def compare(self, target_id: str, base_id: str) -> CompareResult:
        """Compare two checkpoints."""
        data = self.http.request(
            "GET", f"/v1/commits/{target_id}/compare", params={"base_id": base_id}
        )
        return CompareResult.model_validate(data)

    # Commit Groups
    def create_group(self, message: str | None = None) -> CommitGroup:
        """Create a commit group."""
        data = self.http.request(
            "POST",
            "/v1/commit-groups",
            json={"message": message} if message else {},
        )
        return CommitGroup.model_validate(data["group"])

    def seal_group(self, group_id: str) -> CommitGroup:
        """Seal a commit group."""
        data = self.http.request("POST", f"/v1/commit-groups/{group_id}/seal")
        return CommitGroup.model_validate(data["group"])
