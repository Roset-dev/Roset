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
