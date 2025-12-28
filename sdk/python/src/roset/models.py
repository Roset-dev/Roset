"""
Roset Data Models

Pydantic models for API responses.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

class PaginatedList(BaseModel, Generic[T]):
    """Generic paginated list response."""

    model_config = ConfigDict(extra="ignore")

    items: list[T]
    total: int
    has_more: bool
    page: int
    page_size: int



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


class Webhook(BaseModel):
    """Webhook endpoint."""

    model_config = ConfigDict(extra="ignore")

    id: str
    url: str
    secret: str
    events: list[str]
    enabled: bool
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    last_triggered_at: datetime | None = None
    failure_count: int


class WebhookDelivery(BaseModel):
    """Webhook delivery attempt."""

    model_config = ConfigDict(extra="ignore")

    id: str
    webhook_id: str
    event: str
    payload: dict[str, Any]
    status_code: int | None = None
    success: bool
    attempt_count: int
    created_at: datetime
    delivered_at: datetime | None = None
    error: str | None = None


class Share(BaseModel):
    """File sharing link."""

    model_config = ConfigDict(extra="ignore")

    id: str
    token: str
    node_id: str
    role: Literal["viewer", "editor"]
    created_by: str
    expires_at: datetime | None = None
    revoked_at: datetime | None = None
    created_at: datetime
    url: str


class AuditOp(BaseModel):
    """Audit log operation."""

    model_config = ConfigDict(extra="ignore")

    id: str
    tenant_id: str
    actor_id: str
    action: str
    target_id: str | None = None
    payload: dict[str, Any]
    status: Literal["success", "failure"]
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime


class Mount(BaseModel):
    """Storage mount."""

    model_config = ConfigDict(extra="ignore")

    id: str
    tenant_id: str
    name: str
    provider: Literal["s3", "gcs", "azure", "r2", "minio"]
    bucket: str
    region: str | None = None
    prefix: str | None = None
    read_only: bool
    created_at: datetime


# ============================================================================
# Billing
# ============================================================================


class BillingUsage(BaseModel):
    """Current usage statistics."""

    model_config = ConfigDict(extra="ignore")

    managed_files: int
    api_calls: int
    mount_ops: int
    connectors: int
    active_devices: int
    team_members: int


class BillingLimits(BaseModel):
    """Plan limits."""

    model_config = ConfigDict(extra="ignore")

    api_calls: int | float  # float for Infinity
    managed_files: int | float
    connectors: int | float
    active_devices: int | float
    mount_ops: int | float
    team_members: int | float


class TrendMetric(BaseModel):
    """Trend statistics."""

    model_config = ConfigDict(extra="ignore")

    growth: float
    history: list[float]


class BillingTrend(BaseModel):
    """Usage trends."""

    model_config = ConfigDict(extra="ignore")

    managed_files: TrendMetric | None = None
    api_calls: TrendMetric | None = None


class BillingInfo(BaseModel):
    """Full billing information."""

    model_config = ConfigDict(extra="ignore")

    plan: Literal["free", "starter", "team", "scale", "enterprise"]
    usage: BillingUsage
    limits: BillingLimits
    trend: BillingTrend | None = None
    period_end: datetime


class QuotaStatus(BaseModel):
    """Quota usage status."""

    model_config = ConfigDict(extra="ignore")

    used: int
    limit: int | float
    remaining: int | float
    percent_used: float
    is_exceeded: bool

