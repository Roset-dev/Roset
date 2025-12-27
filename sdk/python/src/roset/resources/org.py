from __future__ import annotations

from roset.http_client import HttpClient
from roset.models import ApiKey, Invitation, Member, Tenant


class OrgResource:
    """Organization/Tenant Management."""

    def __init__(self, http: HttpClient):
        self.http = http

    def get_tenant(self) -> Tenant:
        """Get current tenant details."""
        data = self.http.request("GET", "/v1/org")
        return Tenant.model_validate(data["tenant"])

    def list_members(self) -> list[Member]:
        """List workspace members."""
        data = self.http.request("GET", "/v1/org/members")
        return [Member.model_validate(item) for item in data.get("members", [])]

    def invite_member(self, email: str, role: str) -> Invitation:
        """Invite a new member."""
        data = self.http.request("POST", "/v1/org/invites", json={"email": email, "role": role})
        return Invitation.model_validate(data["invitation"])

    def list_api_keys(self) -> list[ApiKey]:
        """List API keys."""
        data = self.http.request("GET", "/v1/org/api-keys")
        return [ApiKey.model_validate(item) for item in data.get("keys", [])]

    from typing import Any

    def create_api_key(self, name: str, scopes: list[str]) -> dict[str, Any]:
        """Create a new API key. Returns dict with ApiKey object and the 'key' (secret)."""
        data = self.http.request("POST", "/v1/org/api-keys", json={"name": name, "scopes": scopes})
        api_key = ApiKey.model_validate(data["apiKey"])
        return {"api_key": api_key, "key": data["key"]}

    def revoke_api_key(self, key_id: str) -> None:
        """Revoke an API key."""
        self.http.request("DELETE", f"/v1/org/api-keys/{key_id}")
