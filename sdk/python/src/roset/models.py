"""
Roset Data Models

Pydantic models for API responses.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class Node(BaseModel):
    """File or folder in the Roset filesystem."""

    model_config = ConfigDict(extra="ignore")

    id: str
    tenant_id: str
    mount_id: str
    parent_id: str | None
    name: str
    type: Literal["file", "folder"]
    size: int | None = None
    content_type: str | None = None
    commit_status: Literal["active", "committing", "committed"] = "active"
    created_at: datetime
    updated_at: datetime


class Commit(BaseModel):
    """Atomic snapshot of a folder."""

    model_config = ConfigDict(extra="ignore")

    id: str
    tenant_id: str
    node_id: str
    status: Literal["pending", "completed", "failed"]
    message: str | None = None
    manifest_storage_key: str | None = None
    group_id: str | None = None
    created_at: datetime


class CommitGroup(BaseModel):
    """Atomic coordinator for cross-folder commits."""

    model_config = ConfigDict(extra="ignore")

    id: str
    status: Literal["pending", "committed", "failed"]
    message: str | None = None
    created_at: datetime
    committed_at: datetime | None = None


class RefCommit(BaseModel):
    """Embedded commit info in Ref response."""

    model_config = ConfigDict(extra="ignore")

    id: str
    node_id: str
    status: Literal["pending", "completed", "failed"]
    message: str | None = None
    created_at: datetime


class Ref(BaseModel):
    """Named pointer to a commit (e.g., 'latest')."""

    model_config = ConfigDict(extra="ignore")

    name: str
    commit_id: str
    updated_at: datetime
    commit: RefCommit | None = None


class Tenant(BaseModel):
    """Organization/Tenant."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    slug: str
    settings: dict[str, Any]
    created_at: datetime


class Member(BaseModel):
    """Workspace member."""

    model_config = ConfigDict(extra="ignore")

    id: str
    email: str | None
    name: str | None
    role: str
    joined_at: datetime


class Invitation(BaseModel):
    """Pending member invitation."""

    model_config = ConfigDict(extra="ignore")

    email: str
    role: str
    expires_at: datetime
    status: Literal["pending", "accepted", "expired"]


class ApiKey(BaseModel):
    """API Key."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    prefix: str
    scopes: list[str]
    last_used_at: datetime | None
    expires_at: datetime | None
    created_at: datetime


class Integration(BaseModel):
    """Cloud provider integration."""

    model_config = ConfigDict(extra="ignore")

    id: str
    provider: Literal["aws", "gcp", "azure", "supabase"]
    status: Literal["connected", "pending", "errored"]
    last_synced_at: datetime | None
    created_at: datetime


class SearchResult(BaseModel):
    """Search result item."""

    model_config = ConfigDict(extra="ignore")

    node: Node
    score: float
    highlights: dict[str, list[str]]


class FileDiff(BaseModel):
    """File difference in comparison."""

    model_config = ConfigDict(extra="ignore")

    path: str
    name: str
    status: Literal["added", "removed", "changed", "unchanged"]
    size_a: int | None = None
    size_b: int | None = None
    checksum_a: str | None = None
    checksum_b: str | None = None
    is_text_file: bool


class CompareSummary(BaseModel):
    """Comparison summary stats."""

    model_config = ConfigDict(extra="ignore")

    added: int
    removed: int
    changed: int
    size_delta: int
    size_delta_percent: float


class CompareResult(BaseModel):
    """Full comparison result."""

    model_config = ConfigDict(extra="ignore")

    summary: CompareSummary
    files: list[FileDiff]
    metrics: dict[str, Any] | None = None


from typing import Any  # Validated usage for generic dicts
