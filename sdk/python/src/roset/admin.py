from __future__ import annotations

import logging
from typing import Any

from roset.http_client import HttpClient
from roset.resources.integrations import IntegrationsResource
from roset.resources.org import OrgResource

logger = logging.getLogger(__name__)


class RosetAdmin:
    """
    Roset Control Plane Client.

    Example:
        admin = RosetAdmin(
            api_url="https://api.roset.dev",
            api_key="rsk_...",
        )
        members = admin.org.list_members()
    """

    def __init__(
        self,
        api_url: str,
        api_key: str,
        timeout: float = 30.0,
        max_retries: int = 3,
        backoff_factor: float = 0.5,
    ):
        self._http = HttpClient(
            api_url=api_url,
            api_key=api_key,
            timeout=timeout,
            max_retries=max_retries,
            backoff_factor=backoff_factor,
        )

        # Resources
        self.org = OrgResource(self._http)
        self.integrations = IntegrationsResource(self._http)

    def close(self) -> None:
        """Close the HTTP client."""
        self._http.close()

    def __enter__(self) -> RosetAdmin:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
