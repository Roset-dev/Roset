"""
Roset Client

HTTP client for the Roset API.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from roset.exceptions import RosetAPIError, RosetNotFoundError
from roset.models import Commit, CommitGroup, Node, Ref

logger = logging.getLogger(__name__)


class RosetClient:
    """
    Client for the Roset API.

    Example:
        client = RosetClient(
            api_url="https://api.roset.dev",
            api_key="rsk_...",
        )
        folder = client.create_folder("/checkpoints", "step-1000")
        commit = client.commit(folder.id, message="Step 1000", update_ref="latest")
    """

    def __init__(
        self,
        api_url: str,
        api_key: str,
        mount_id: str | None = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        backoff_factor: float = 0.5,
    ):
        """
        Initialize Roset client.

        Args:
            api_url: Base URL for Roset API (e.g., "https://api.roset.dev")
            api_key: API key (starts with "rsk_")
            mount_id: Optional mount ID (uses default mount if not specified)
            timeout: Request timeout in seconds
            max_retries: Max retries for transient errors
            backoff_factor: Backoff factor for retries
        """
        self.api_url = api_url.rstrip("/")
        self.mount_id = mount_id
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
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
        """Close the HTTP client."""
        self._client.close()

    def __enter__(self) -> RosetClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    # =========================================================================
    # Request Helpers
    # =========================================================================

    def _request(
        self,
        method: str,
        path: str,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Make an API request and handle errors with retries."""
        for attempt in range(self.max_retries + 1):
            try:
                response = self._client.request(method, path, json=json, params=params)

                if response.status_code == 404:
                    raise RosetNotFoundError("Resource")

                if response.status_code >= 400:
                    # Don't retry client errors (except strict 429 if we wanted)
                    if response.status_code < 500 and response.status_code != 429:
                        data = response.json()
                        raise RosetAPIError(
                            message=data.get("error", "Unknown error"),
                            status_code=response.status_code,
                            code=data.get("code"),
                            details=data.get("details"),
                        )
                    # For 5xx or 429, raise to trigger retry
                    response.raise_for_status()

                if response.status_code == 204:
                    return {}

                return response.json()

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
                
                sleep_time = self.backoff_factor * (2 ** attempt)
                logger.warning(
                    f"Request failed (attempt {attempt + 1}/{self.max_retries}), "
                    f"retrying in {sleep_time:.2f}s: {e}"
                )
                time.sleep(sleep_time)

        return {}  # Should be unreachable

    # =========================================================================
    # Nodes
    # =========================================================================

    def get_node(self, node_id: str) -> Node:
        """Get a node by ID."""
        data = self._request("GET", f"/v1/nodes/{node_id}")
        return Node.model_validate(data["node"])
    
    def resolve_path(self, path: str) -> Node | None:
        """
        Resolve a path to a node.
        
        Args:
            path: Absolute path (e.g. "/checkpoints/step-1")
            
        Returns:
            Node if found, None otherwise
        """
        data = self._request("POST", "/v1/resolve", json={"paths": [path]})
        nodes = data.get("nodes", [])
        if not nodes or nodes[0] is None:
            return None
        return Node.model_validate(nodes[0])

    def create_folder(self, parent_path: str, name: str) -> Node:
        """
        Create a folder.

        Args:
            parent_path: Path to parent folder (e.g., "/checkpoints")
            name: Folder name (e.g., "step-1000")

        Returns:
            Created Node
        """
        data = self._request(
            "POST",
            "/v1/nodes",
            json={"path": parent_path, "name": name, "type": "folder"},
        )
        return Node.model_validate(data["node"])

    def delete_node(self, node_id: str) -> None:
        """Soft delete a node (moves to trash)."""
        self._request("DELETE", f"/v1/nodes/{node_id}")

    # =========================================================================
    # Commits
    # =========================================================================

    def commit(
        self,
        node_id: str,
        message: str | None = None,
        group_id: str | None = None,
    ) -> Commit:
        """
        Commit a folder atomically.

        Args:
            node_id: Folder node ID
            message: Optional commit message
            group_id: Optional commit group ID for cross-folder atomicity

        Returns:
            Pending Commit (poll get_commit for completion)
        """
        data = self._request(
            "POST",
            f"/v1/nodes/{node_id}/commit",
            json={
                "message": message,
                **({"group_id": group_id} if group_id else {}),
            },
        )
        return Commit.model_validate(data["commit"])

    def get_commit(self, commit_id: str) -> Commit:
        """Get commit status (for polling)."""
        data = self._request("GET", f"/v1/commits/{commit_id}")
        return Commit.model_validate(data["commit"])

    def wait_for_commit(
        self,
        commit_id: str,
        timeout: float = 60.0,
        poll_interval: float = 0.5,
    ) -> Commit:
        """
        Wait for commit to complete.

        Args:
            commit_id: Commit ID
            timeout: Max wait time in seconds
            poll_interval: Poll interval in seconds

        Returns:
            Completed Commit

        Raises:
            RosetAPIError: If commit fails or times out
        """
        start = time.time()
        while time.time() - start < timeout:
            commit = self.get_commit(commit_id)
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

    # =========================================================================
    # Commit Groups
    # =========================================================================

    def create_commit_group(self, message: str | None = None) -> CommitGroup:
        """Create a commit group for cross-folder atomicity."""
        data = self._request(
            "POST",
            "/v1/commit-groups",
            json={"message": message} if message else {},
        )
        return CommitGroup.model_validate(data["group"])

    def seal_commit_group(self, group_id: str) -> CommitGroup:
        """Seal (finalize) a commit group."""
        data = self._request("POST", f"/v1/commit-groups/{group_id}/seal")
        return CommitGroup.model_validate(data["group"])

    # =========================================================================
    # Refs
    # =========================================================================

    def get_ref(self, name: str) -> Ref | None:
        """
        Get a ref by name.

        Args:
            name: Ref name (e.g., "latest")

        Returns:
            Ref or None if not found
        """
        try:
            data = self._request("GET", f"/v1/refs/{name}")
            return Ref.model_validate(data["ref"])
        except RosetNotFoundError:
            return None

    def update_ref(
        self,
        name: str,
        commit_id: str,
        expected_commit_id: str | None = None,
    ) -> Ref:
        """
        Update a ref atomically.

        Args:
            name: Ref name (e.g., "latest")
            commit_id: Commit ID to point to
            expected_commit_id: For CAS - only update if current matches

        Returns:
            Updated Ref
        """
        data = self._request(
            "PUT",
            f"/v1/refs/{name}",
            json={
                "commit_id": commit_id,
                **({"expected_commit_id": expected_commit_id} if expected_commit_id else {}),
            },
        )
        return Ref.model_validate(data["ref"])

    def delete_ref(self, name: str) -> None:
        """Delete a ref."""
        self._request("DELETE", f"/v1/refs/{name}")
