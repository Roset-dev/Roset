/**
 * Connections resource -- manage storage provider links.
 *
 * A connection represents a link between Roset and an external storage bucket
 * (S3, GCS, Azure Blob Storage, Cloudflare R2, MinIO, Supabase Storage,
 * Backblaze B2, DigitalOcean Spaces, or Wasabi). Connections let Roset
 * enumerate files in your buckets, issue signed URLs for direct
 * upload/download, and sync file metadata.
 *
 * Roset never proxies file bytes -- all file transfers happen directly
 * between the client and the storage provider via signed URLs.
 *
 * @module resources/connections
 */

import type { HttpClient } from "../client.js";

/**
 * A storage provider connection record.
 *
 * Represents a configured link to an external storage bucket with its
 * provider type, bucket details, sync status, and timestamps.
 */
export interface ConnectionRecord {
  /** Unique connection identifier (UUID). */
  id: string;

  /** Human-readable display name for this connection. */
  name: string;

  /** Storage provider type: `"s3"`, `"gcs"`, `"azure_blob"`, `"r2"`, `"minio"`, `"supabase_storage"`, `"b2"`, `"do_spaces"`, or `"wasabi"`. */
  provider: string;

  /** Name of the storage bucket this connection targets. */
  bucket_name: string;

  /** Cloud region of the bucket (e.g. `"us-east-1"`), or null for region-agnostic providers. */
  region: string | null;

  /** Key prefix (folder path) to scope this connection within the bucket. */
  base_prefix: string;

  /** Custom endpoint URL for S3-compatible providers (MinIO, Wasabi, etc.), or null for native providers. */
  endpoint: string | null;

  /** Connection status: `"active"`, `"syncing"`, `"error"`, etc. */
  status: string;

  /** ISO 8601 timestamp of the last successful sync, or null if never synced. */
  last_sync_at: string | null;

  /** ISO 8601 timestamp of when the connection was created. */
  created_at: string;

  /** ISO 8601 timestamp of the last update. */
  updated_at: string;
}

/**
 * Resource for managing storage provider connections.
 *
 * Provides methods to create, list, retrieve, delete, test, sync, and
 * enumerate files within connected storage buckets.
 */
export class ConnectionsResource {
  constructor(private http: HttpClient) {}

  /**
   * Create a new storage provider connection.
   *
   * Registers a link to an external storage bucket so Roset can enumerate
   * files, issue signed URLs, and sync metadata.
   *
   * @param params - Connection configuration.
   * @param params.name - Human-readable display name (e.g. `"Production S3 Bucket"`).
   * @param params.provider - Storage provider type: `"s3"`, `"gcs"`, `"azure_blob"`, `"r2"`, `"minio"`, `"supabase_storage"`, `"b2"`, `"do_spaces"`, or `"wasabi"`.
   * @param params.bucket_name - Name of the storage bucket.
   * @param params.region - Optional cloud region (e.g. `"us-east-1"`).
   * @param params.base_prefix - Optional key prefix to scope the connection within the bucket.
   * @param params.endpoint - Optional custom endpoint URL for S3-compatible providers.
   * @param params.credentials - Optional provider-specific credentials object.
   * @returns The newly created connection record.
   * @throws {ValidationError} If required fields are missing or the provider is unsupported.
   * @throws {ConflictError} If a connection with the same name already exists.
   */
  async create(params: {
    name: string;
    provider: string;
    bucket_name: string;
    region?: string;
    base_prefix?: string;
    endpoint?: string;
    credentials?: Record<string, unknown>;
  }): Promise<ConnectionRecord> {
    return this.http.post<ConnectionRecord>("/v1/connections", params);
  }

  /**
   * List all storage provider connections for the organization.
   *
   * @returns Object containing an array of all connection records.
   */
  async list(): Promise<{ connections: ConnectionRecord[] }> {
    return this.http.get<{ connections: ConnectionRecord[] }>("/v1/connections");
  }

  /**
   * Retrieve a single connection by ID.
   *
   * @param id - The connection's unique identifier (UUID).
   * @returns The full connection record.
   * @throws {NotFoundError} If the connection does not exist.
   */
  async get(id: string): Promise<ConnectionRecord> {
    return this.http.get<ConnectionRecord>(`/v1/connections/${id}`);
  }

  /**
   * Delete a storage provider connection.
   *
   * Removes the connection and stops syncing. Does not delete files from the
   * storage provider -- only the Roset metadata link is removed.
   *
   * @param id - The connection's unique identifier (UUID).
   * @throws {NotFoundError} If the connection does not exist.
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/connections/${id}`);
  }

  /**
   * Test a connection's credentials and accessibility.
   *
   * Verifies that Roset can reach the storage bucket and authenticate using
   * the stored credentials. Use this after creating or updating a connection.
   *
   * @param id - The connection's unique identifier (UUID).
   * @returns Test result with `success` flag and optional diagnostic `message`.
   * @throws {NotFoundError} If the connection does not exist.
   */
  async test(id: string): Promise<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`/v1/connections/${id}/test`);
  }

  /**
   * Trigger a metadata sync for a connection.
   *
   * Enumerates files in the remote storage bucket and syncs their metadata
   * (names, sizes, content types) into Roset as nodes.
   *
   * @param id - The connection's unique identifier (UUID).
   * @returns Sync status.
   * @throws {NotFoundError} If the connection does not exist.
   */
  async sync(id: string): Promise<{ status: string }> {
    return this.http.post<{ status: string }>(`/v1/connections/${id}/sync`);
  }

  /**
   * Enumerate files in a connected storage bucket.
   *
   * Lists objects directly from the remote storage provider (not cached
   * metadata). Useful for browsing bucket contents before syncing.
   *
   * @param id - The connection's unique identifier (UUID).
   * @param params - Optional enumeration parameters.
   * @param params.prefix - Key prefix to filter results (e.g. `"documents/2024/"`).
   * @param params.limit - Maximum number of objects to return.
   * @returns Provider-specific listing of objects in the bucket.
   * @throws {NotFoundError} If the connection does not exist.
   */
  async enumerate(id: string, params?: { prefix?: string; limit?: number }): Promise<unknown> {
    const query: Record<string, string> = {};
    if (params?.prefix) query.prefix = params.prefix;
    if (params?.limit) query.limit = String(params.limit);
    return this.http.get(`/v1/connections/${id}/enumerate`, query);
  }
}
