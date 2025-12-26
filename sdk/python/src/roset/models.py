"""
Roset Data Models

Pydantic models for API responses.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional, Union

from pydantic import BaseModel, ConfigDict


class Node(BaseModel):
    """File or folder in the Roset filesystem."""

    model_config = ConfigDict(extra="ignore")

    id: str
    tenant_id: str
    mount_id: str
    parent_id: Optional[str]
    name: str
    type: Literal["file", "folder"]
    size: Optional[int] = None
    content_type: Optional[str] = None
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
    message: Optional[str] = None
    manifest_storage_key: Optional[str] = None
    group_id: Optional[str] = None
    created_at: datetime


class CommitGroup(BaseModel):
    """Atomic coordinator for cross-folder commits."""

    model_config = ConfigDict(extra="ignore")

    id: str
    status: Literal["pending", "committed", "failed"]
    message: Optional[str] = None
    created_at: datetime
    committed_at: Optional[datetime] = None


class Ref(BaseModel):
    """Named pointer to a commit (e.g., 'latest')."""

    model_config = ConfigDict(extra="ignore")

    name: str
    commit_id: str
    updated_at: datetime
    commit: Optional[RefCommit] = None


class RefCommit(BaseModel):
    """Embedded commit info in Ref response."""

    model_config = ConfigDict(extra="ignore")

    id: str
    node_id: str
    status: Literal["pending", "completed", "failed"]
    message: Optional[str] = None
    created_at: datetime


# Resolve forward reference
Ref.model_rebuild()
