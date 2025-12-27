from __future__ import annotations

import logging
from typing import Any

from roset.http_client import HttpClient
from roset.resources.audit import AuditResource
from roset.resources.commits import CommitsResource
from roset.resources.mounts import MountsResource
from roset.resources.nodes import NodesResource
from roset.resources.refs import RefsResource
from roset.resources.search import SearchResource
from roset.resources.shares import SharesResource
from roset.resources.uploads import UploadsResource

logger = logging.getLogger(__name__)


class RosetClient:
    """
    Roset Data Plane Client.

    Example:
        client = RosetClient(
            api_url="https://api.roset.dev",
            api_key="rsk_...",
        )
        nodes = client.nodes.resolve("/checkpoints")
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
        self._http = HttpClient(
            api_url=api_url,
            api_key=api_key,
            mount_id=mount_id,
            timeout=timeout,
            max_retries=max_retries,
            backoff_factor=backoff_factor,
        )

        # Resources
        self.nodes = NodesResource(self._http)
        self.uploads = UploadsResource(self._http)
        self.shares = SharesResource(self._http)
        self.audit = AuditResource(self._http)
        self.mounts = MountsResource(self._http)
        self.commits = CommitsResource(self._http)
        self.refs = RefsResource(self._http)
        self.search = SearchResource(self._http)

    def close(self) -> None:
        """Close the HTTP client."""
        self._http.close()

    def __enter__(self) -> RosetClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    @property
    def mount_id(self) -> str | None:
        return self._http.mount_id
