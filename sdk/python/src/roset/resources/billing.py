from __future__ import annotations

from roset.http_client import HttpClient
from roset.models import BillingInfo, QuotaStatus


class BillingResource:
    """Billing and Usage Management."""

    def __init__(self, http: HttpClient):
        self.http = http

    def get_usage(self) -> BillingInfo:
        """Get current billing info including plan, usage, and limits."""
        data = self.http.request("GET", "/v1/billing")
        return BillingInfo.model_validate(data)

    def check_quota(self, meter: str) -> QuotaStatus:
        """
        Check quota for a specific meter.
        Calculates percentage used and remaining entitlement.
        """
        info = self.get_usage()
        
        # Get usage and limit for the requested meter
        # Use getattr to dynamic access fields on Pydantic models
        used = getattr(info.usage, meter, 0)
        limit = getattr(info.limits, meter, 0)

        # Handle infinite limits (represented as float('inf') or equivalent)
        effective_limit = float('inf') if limit is None else float(limit)

        remaining = float('inf')
        percent_used = 0.0
        is_exceeded = False

        if effective_limit != float('inf'):
            remaining = max(0.0, effective_limit - used)
            percent_used = (used / effective_limit) * 100 if effective_limit > 0 else 100.0
            is_exceeded = used >= effective_limit

        return QuotaStatus(
            used=used,
            limit=effective_limit,
            remaining=remaining,
            percent_used=percent_used,
            is_exceeded=is_exceeded
        )
