import { HttpClient } from "../http.js";
import { RosetClientConfig } from "../types.js";

/**
 * Tenant Resource
 * 
 * Access tenant-level metadata and statistics
 */
export class TenantResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Get tenant overview statistics
   * 
   * Returns aggregated counts for the control plane overview:
   * - Total files
   * - Total storage (bytes)
   * - Active shares
   * - Connected devices
   * 
   * @example
   * const stats = await admin.tenant.stats()
   * console.log(`${stats.files} files, ${stats.storage} bytes`)
   */
  async stats(): Promise<TenantStats> {
    return this.http.get<TenantStats>("/v1/tenant/stats");
  }
}

export interface TenantStats {
  /** Total number of non-deleted files */
  files: number;
  /** Total storage used in bytes */
  storage: number;
  /** Number of active (non-revoked, non-expired) shares */
  activeShares: number;
  /** Number of currently connected devices */
  connectedDevices: number;
  /** Total number of unique devices (ever connected) */
  totalDevices: number;
  /** ISO timestamp of when stats were computed */
  computedAt: string;
}
