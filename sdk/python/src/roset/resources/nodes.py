from __future__ import annotations

from typing import Any, Literal
from roset.http_client import HttpClient
from roset.models import Node


class Resource:
    def __init__(self, http: HttpClient):
        self.http = http

class NodesResource(Resource):
    """File and folder management."""

    def get(self, node_id: str) -> Node:
        """Get a node by ID."""
        data = self.http.request("GET", f"/v1/nodes/{node_id}")
        return Node.model_validate(data["node"])

    def resolve(self, path: str) -> Node | None:
        """Resolve a path to a node."""
        try:
            data = self.http.request("POST", "/v1/resolve", json={"paths": [path]})
            nodes = data.get("nodes", [])
            if not nodes or nodes[0] is None:
                return None
            return Node.model_validate(nodes[0])
        except Exception:
            return None

    def list_children(
        self,
        node_id: str,
        page: int = 1,
        page_size: int = 50,
        sort_by: str | None = None,
        sort_order: str | None = None,
        type: Literal["file", "folder"] | None = None,
    ) -> dict[str, Any]:
        """List children of a folder."""
        params: dict[str, Any] = {"page": page, "pageSize": page_size}
        if sort_by:
            params["sortBy"] = sort_by
        if sort_order:
            params["sortOrder"] = sort_order
        if type:
            params["type"] = type
            
        return self.http.request("GET", f"/v1/nodes/{node_id}/children", params=params)

    def create(
        self,
        name: str,
        type: Literal["file", "folder"],
        parent_id: str | None = None,
        parent_path: str | None = None,
        metadata: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> Node:
        """Create a new file or folder."""
        payload: dict[str, Any] = {"name": name, "type": type}
        if parent_id:
            payload["parentId"] = parent_id
        if parent_path:
            payload["parentPath"] = parent_path
        if metadata:
            payload["metadata"] = metadata

        headers = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        data = self.http.request("POST", "/v1/nodes", json=payload, headers=headers)
        return Node.model_validate(data["node"])

    def create_folder(
        self, 
        name: str, 
        parent_path: str | None = None,
        parent_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Node:
        """Create a folder (convenience method)."""
        return self.create(
            name=name, 
            type="folder", 
            parent_path=parent_path, 
            parent_id=parent_id,
            metadata=metadata
        )

    def update(
        self,
        node_id: str,
        name: str | None = None,
        parent_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> Node:
        """Update a node (rename, move, or update metadata)."""
        payload: dict[str, Any] = {}
        if name:
            payload["name"] = name
        if parent_id:
            payload["parentId"] = parent_id
        if metadata:
            payload["metadata"] = metadata

        headers = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        data = self.http.request(
            "PATCH", f"/v1/nodes/{node_id}", json=payload, headers=headers
        )
        return Node.model_validate(data["node"])

    def rename(self, node_id: str, new_name: str) -> Node:
        """Rename a node."""
        return self.update(node_id, name=new_name)

    def move(self, node_id: str, new_parent_id: str, new_name: str | None = None) -> Node:
        """Move a node."""
        return self.update(node_id, parent_id=new_parent_id, name=new_name)

    def delete(self, node_id: str) -> None:
        """Delete a node (soft delete)."""
        self.http.request("DELETE", f"/v1/nodes/{node_id}")

    def restore(self, node_id: str) -> Node:
        """Restore a node from trash."""
        data = self.http.request("POST", f"/v1/nodes/{node_id}/restore", json={})
        return Node.model_validate(data["node"])
