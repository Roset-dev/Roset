from __future__ import annotations
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

    def create_folder(self, parent_path: str, name: str) -> Node:
        """Create a folder."""
        data = self.http.request(
            "POST",
            "/v1/nodes",
            json={"path": parent_path, "name": name, "type": "folder"},
        )
        return Node.model_validate(data["node"])

    def delete(self, node_id: str) -> None:
        """Delete a node."""
        self.http.request("DELETE", f"/v1/nodes/{node_id}")
