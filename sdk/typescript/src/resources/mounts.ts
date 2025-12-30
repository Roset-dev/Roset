/**
 * Mounts Resource - Storage backend management
 */

import { HttpClient } from "../http.js";
import type { RosetClientConfig, RequestOptions, Mount, CreateMountOptions, UpdateMountOptions } from "../types.js";

export class MountsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * List all mounts for the tenant
   */
  async list(options?: RequestOptions): Promise<Mount[]> {
    const response = await this.http.get<{ mounts: Mount[] }>("/v1/mounts", options);
    return response.mounts;
  }

  /**
   * Get a mount by ID
   */
  async get(
    id: string,
    options?: RequestOptions
  ): Promise<Mount> {
    // API returns the mount object directly (not wrapped)
    return this.http.get(`/v1/mounts/${id}`, options);
  }

  /**
   * Create a new mount
   */
  async create(
    data: CreateMountOptions,
    options?: RequestOptions
  ): Promise<Mount> {
    const response = await this.http.post<{ mount: Mount }>("/v1/mounts", data, options);
    return response.mount;
  }

  /**
   * Update a mount
   */
  async update(
    id: string,
    data: UpdateMountOptions,
    options?: RequestOptions
  ): Promise<Mount> {
    const response = await this.http.patch<{ mount: Mount }>(`/v1/mounts/${id}`, data, options);
    return response.mount;
  }

  /**
   * Delete a mount (must be empty)
   */
  async delete(id: string, options?: RequestOptions): Promise<void> {
    await this.http.delete(`/v1/mounts/${id}`, options);
  }

  /**
   * Get the default mount for the tenant
   */
  async getDefault(options?: RequestOptions): Promise<Mount | null> {
    const mounts = await this.list(options);
    return mounts.find((m) => m.isDefault) ?? mounts[0] ?? null;
  }

  /**
   * Set retention days for a mount
   */
  async setRetention(
    id: string,
    retentionDays: number | null,
    options?: RequestOptions
  ): Promise<Mount> {
    return this.update(id, { retentionDays }, options);
  }

  /**
   * Test mount connection
   */
  async testConnection(id: string, options?: RequestOptions): Promise<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `/v1/mounts/${id}/test`,
      {},
      options
    );
  }
}
