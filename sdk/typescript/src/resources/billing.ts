import { HttpClient } from "../http.js";
import { BillingInfo, QuotaStatus, RosetClientConfig } from "../types.js";

/**
 * Billing Resource
 * Access plan information, usage, and limits
 */
export class BillingResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Get current billing info including plan, usage, and limits
   */
  async getUsage(): Promise<BillingInfo> {
    return this.http.get<BillingInfo>("/v1/billing");
  }

  /**
   * Check quota for a specific meter
   * Calculates percentage used and remaining entitlement
   */
  async checkQuota(meter: keyof BillingInfo["limits"]): Promise<QuotaStatus> {
    const info = await this.getUsage();
    const used = info.usage[meter] || 0;
    const limit = info.limits[meter];

    // Handle Infinity limits (enterprise)
    const effectiveLimit = limit === null || limit === undefined ? Infinity : limit;

    return {
      used,
      limit: effectiveLimit,
      remaining: effectiveLimit === Infinity ? Infinity : Math.max(0, effectiveLimit - used),
      percentUsed: effectiveLimit === Infinity ? 0 : (used / effectiveLimit) * 100,
      isExceeded: effectiveLimit === Infinity ? false : used >= effectiveLimit,
    };
  }
}
