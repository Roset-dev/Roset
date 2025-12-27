from __future__ import annotations
from typing import Any
from datetime import datetime
from roset.http_client import HttpClient
from roset.models import SearchResult

class SearchResource:
    """Search and Discovery."""

    def __init__(self, http: HttpClient):
        self.http = http

    def query(
        self,
        query: str,
        type: str | None = None,
        parent_id: str | None = None,
        extensions: list[str] | None = None,
        min_size: int | None = None,
        max_size: int | None = None,
        start_date: datetime | str | None = None,
        end_date: datetime | str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> list[SearchResult]:
        """Search for files and folders."""
        params: dict[str, Any] = {
            "q": query,
            "page": page,
            "page_size": page_size,
        }

        if type:
            params["type"] = type
        if parent_id:
            params["parent_id"] = parent_id
        if extensions:
            params["extensions"] = ",".join(extensions)
        if min_size:
            params["min_size"] = min_size
        if max_size:
            params["max_size"] = max_size
        
        # Format dates as ISO strings if they are datetime objects
        if start_date:
            params["start_date"] = start_date.isoformat() if isinstance(start_date, datetime) else start_date
        if end_date:
            params["end_date"] = end_date.isoformat() if isinstance(end_date, datetime) else end_date

        data = self.http.request("GET", "/v1/search", params=params)
        return [SearchResult.model_validate(item) for item in data.get("items", [])]
