/**
 * Mounts Resource - Storage backend management
 */

import { HttpClient } from "../http.js";
import type { RosetClientConfig, RequestOptions } from "../types.js";

export interface Mount {
  id: string;
  tenantId: string;
  name: string;
  provider: "s3" | "r2" | "minio" | "gcs" | "azure";
  bucket: string;
  region: string | null;
  basePrefix: string;
  endpoint: string | null;
  isDefault: boolean;
  retentionDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MountRetentionInfo {
  retentionDays: number | null;
  trashCount: number;
  oldestTrash: string | null;
}

export interface CreateMountOptions {
  name: string;
  provider: "s3" | "r2" | "minio" | "gcs" | "azure";
  bucket: string;
  region?: string;
  basePrefix?: string;
  endpoint?: string;
  isDefault?: boolean;
  retentionDays?: number;
}

export interface UpdateMountOptions {
  name?: string;
  isDefault?: boolean;
  retentionDays?: number | null;
}

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
  ): Promise<{ mount: Mount; retention: MountRetentionInfo }> {
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
}
