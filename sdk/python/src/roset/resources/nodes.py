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
        return Node.model_validate(data)

    def resolve(self, path: str) -> Node | None:
        """Resolve a single path to a node."""
        result = self.resolve_many([path])
        return result.get(path)

    def resolve_many(self, paths: list[str]) -> dict[str, Node | None]:
        """
        Resolve multiple paths to nodes in a single request.

        Args:
            paths: List of paths to resolve (max 100)

        Returns:
            Dict mapping paths to Node objects (or None if not found)

        Example:
            result = client.nodes.resolve_many(['/documents', '/images'])
            # result = {'/documents': Node(...), '/images': None}
        """
        data = self.http.request("POST", "/v1/resolve", json={"paths": paths})
        result: dict[str, Node | None] = {}
        for path in paths:
            node_data = data.get(path)
            if node_data:
                result[path] = Node.model_validate(node_data)
            else:
                result[path] = None
        return result

    def stat_many(self, ids: list[str]) -> dict[str, Node | None]:
        """
        Get metadata for multiple nodes by ID in a single request.

        Args:
            ids: List of node IDs to fetch (max 100)

        Returns:
            Dict mapping node IDs to Node objects (or None if not found)

        Example:
            result = client.nodes.stat_many(['id1', 'id2', 'id3'])
            # result = {'id1': Node(...), 'id2': Node(...), 'id3': None}
        """
        data = self.http.request("POST", "/v1/nodes/batch/stat", json={"ids": ids})
        result: dict[str, Node | None] = {}
        for node_id in ids:
            node_data = data.get(node_id)
            if node_data:
                result[node_id] = Node.model_validate(node_data)
            else:
                result[node_id] = None
        return result

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
        return Node.model_validate(data)

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
            metadata=metadata,
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

        data = self.http.request("PATCH", f"/v1/nodes/{node_id}", json=payload, headers=headers)
        return Node.model_validate(data)

    def rename(self, node_id: str, new_name: str) -> Node:
        """Rename a node."""
        return self.update(node_id, name=new_name)

    def move(self, node_id: str, new_parent_id: str, new_name: str | None = None) -> Node:
        """Move a node."""
        return self.update(node_id, parent_id=new_parent_id, name=new_name)

    def delete(self, node_id: str) -> None:
        """Delete a node (soft delete - moves to trash)."""
        self.http.request("DELETE", f"/v1/nodes/{node_id}")

    def delete_many(self, ids: list[str]) -> None:
        """
        Batch delete multiple nodes (soft delete - moves to trash).

        Args:
            ids: List of node IDs to delete (max 100)

        Example:
            client.nodes.delete_many(['id1', 'id2', 'id3'])
        """
        self.http.request("POST", "/v1/nodes/batch/delete", json={"ids": ids})

    def move_many(self, ids: list[str], parent_id: str) -> list[Node]:
        """
        Batch move multiple nodes to a new parent folder.

        Args:
            ids: List of node IDs to move (max 100)
            parent_id: Target parent folder ID

        Returns:
            List of updated Node objects

        Example:
            nodes = client.nodes.move_many(['id1', 'id2'], 'folder_id')
        """
        data = self.http.request(
            "POST", "/v1/nodes/batch/move", json={"ids": ids, "parentId": parent_id}
        )
        return [Node.model_validate(node) for node in data]

    def restore(self, node_id: str) -> Node:
        """Restore a node from trash."""
        data = self.http.request("POST", f"/v1/nodes/{node_id}/restore", json={})
        return Node.model_validate(data)

    # =========================================================================
    # Trash Management
    # =========================================================================

    def permanent_delete(self, node_id: str) -> None:
        """
        Permanently delete a node (from trash).
        Node must be in trash first.

        Args:
            node_id: ID of the trashed node to permanently delete
        """
        self.http.request("DELETE", f"/v1/nodes/{node_id}/permanent")

    def permanent_delete_many(self, ids: list[str]) -> None:
        """
        Batch permanently delete multiple nodes (from trash).

        Args:
            ids: List of trashed node IDs to permanently delete (max 100)

        Example:
            client.nodes.permanent_delete_many(['id1', 'id2'])
        """
        self.http.request("POST", "/v1/nodes/batch/permanent-delete", json={"ids": ids})

    def list_trash(
        self,
        page: int = 1,
        page_size: int = 50,
        sort_by: str | None = None,
        sort_order: str | None = None,
    ) -> dict[str, Any]:
        """
        List items in trash.

        Args:
            page: Page number (default: 1)
            page_size: Items per page (default: 50)
            sort_by: Field to sort by
            sort_order: 'asc' or 'desc'

        Returns:
            Paginated result with items, total, hasMore
        """
        params: dict[str, Any] = {"page": page, "pageSize": page_size}
        if sort_by:
            params["sortBy"] = sort_by
        if sort_order:
            params["sortOrder"] = sort_order

        return self.http.request("GET", "/v1/trash", params=params)

    def empty_trash(self) -> dict[str, int]:
        """
        Permanently delete all items in trash.

        Returns:
            Dict with 'deletedCount' indicating number of items deleted
        """
        return self.http.request("DELETE", "/v1/trash")

