/**
 * Leases Resource - File-level lease management
 */

import { HttpClient } from "../http.js";
import type { RosetClientConfig, RequestOptions } from "../types.js";

export interface Lease {
  id: string;
  tenantId: string;
  nodeId: string;
  principalId: string;
  mode: "exclusive" | "shared";
  expiresAt: string;
  createdAt: string;
}

export interface AcquireLeaseOptions {
  /** Lease mode */
  mode: "exclusive" | "shared";
  /** Duration in seconds (default: 300 = 5 minutes, max: 86400 = 24 hours) */
  durationSeconds?: number;
}

export interface RenewLeaseOptions {
  /** Duration in seconds */
  durationSeconds?: number;
}

export class LeasesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Acquire a lease on a node
   */
  async acquire(
    nodeId: string,
    options: AcquireLeaseOptions,
    requestOptions?: RequestOptions
  ): Promise<Lease> {
    const response = await this.http.post<{ lease: Lease }>(
      `/v1/nodes/${nodeId}/lease`,
      options,
      requestOptions
    );
    return response.lease;
  }

  /**
   * Renew an existing lease
   */
  async renew(
    nodeId: string,
    options?: RenewLeaseOptions,
    requestOptions?: RequestOptions
  ): Promise<Lease> {
    const response = await this.http.patch<{ lease: Lease }>(
      `/v1/nodes/${nodeId}/lease`,
      options ?? {},
      requestOptions
    );
    return response.lease;
  }

  /**
   * Release a lease
   */
  async release(nodeId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.http.delete(`/v1/nodes/${nodeId}/lease`, requestOptions);
  }

  /**
   * Get all active leases for a node
   */
  async getForNode(nodeId: string, requestOptions?: RequestOptions): Promise<Lease[]> {
    const response = await this.http.get<{ leases: Lease[] }>(
      `/v1/nodes/${nodeId}/leases`,
      requestOptions
    );
    return response.leases;
  }

  /**
   * Get all my active leases
   */
  async getMine(requestOptions?: RequestOptions): Promise<Lease[]> {
    const response = await this.http.get<{ leases: Lease[] }>("/v1/leases", requestOptions);
    return response.leases;
  }

  /**
   * Execute a function while holding a lease, automatically releasing afterward
   */
  async withLease<T>(
    nodeId: string,
    options: AcquireLeaseOptions,
    fn: (lease: Lease) => Promise<T>
  ): Promise<T> {
    const lease = await this.acquire(nodeId, options);
    try {
      return await fn(lease);
    } finally {
      await this.release(nodeId).catch(() => {
        // Ignore release errors (lease may have expired)
      });
    }
  }
}
