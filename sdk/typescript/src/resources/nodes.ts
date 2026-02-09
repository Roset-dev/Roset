/**
 * Nodes resource -- browse and manipulate files and folders in connected storage.
 *
 * Nodes represent the file/folder tree within a connected storage bucket.
 * Each node is either a `"file"` or `"folder"` and may belong to a connection.
 * Nodes provide a hierarchical browsing interface over flat object storage,
 * supporting operations like list, get, delete, download, upload (signed URLs),
 * move, rename, and search.
 *
 * Unlike {@link FilesResource} (which manages files uploaded through the Roset
 * processing pipeline), nodes represent the raw storage tree -- including files
 * synced from connected buckets that may not yet have been processed.
 *
 * @module resources/nodes
 */

import type { HttpClient } from "../client.js";

/**
 * A file or folder node in the storage tree.
 *
 * Nodes form a hierarchical structure via `parent_id` references, overlaying
 * folder semantics onto flat object storage. Each node tracks its storage
 * location, sync status, content metadata, and space ownership.
 */
export interface NodeRecord {
  /** Unique node identifier (UUID). */
  id: string;

  /** ID of the connection this node belongs to, or null for root-level nodes. */
  connection_id: string | null;

  /** ID of the parent folder node, or null for top-level items. */
  parent_id: string | null;

  /** Node type: `"file"` or `"folder"`. */
  type: string;

  /** Display name of the file or folder. */
  name: string;

  /** Storage object key (path) in the bucket, or null for virtual folders. */
  storage_key: string | null;

  /** File size in bytes (0 for folders). */
  size_bytes: number;

  /** MIME content type, or null for folders. */
  content_type: string | null;

  /** Entity tag for change detection, or null if not available. */
  etag: string | null;

  /** Node status: `"active"`, `"deleted"` (soft-deleted / trashed), etc. */
  status: string;

  /** Space namespace this node belongs to, or null. */
  space: string | null;

  /** JSON-encoded user-supplied or sync-derived metadata. */
  metadata: string;

  /** Content hash for deduplication, or null if not computed. */
  file_hash: string | null;

  /** ISO 8601 timestamp of when the node was created. */
  created_at: string;

  /** ISO 8601 timestamp of the last update. */
  updated_at: string;
}

/**
 * Paginated response from {@link NodesResource.list} and related listing methods.
 */
export interface ListNodesResponse {
  /** Array of node records matching the query. */
  nodes: NodeRecord[];

  /** Cursor for fetching the next page, or `null` if this is the last page. */
  next_cursor: string | null;
}

/**
 * Resource for browsing and manipulating the file/folder tree in connected
 * storage buckets.
 *
 * Provides methods for listing, retrieving, uploading, downloading, moving,
 * renaming, deleting, and searching nodes.
 */
export class NodesResource {
  constructor(private http: HttpClient) {}

  /**
   * List nodes with optional filtering and cursor-based pagination.
   *
   * @param params - Optional filter and pagination parameters.
   * @param params.connection_id - Filter by storage connection ID.
   * @param params.parent_id - Filter by parent folder ID. Pass `null` for root-level nodes.
   * @param params.status - Filter by node status (e.g. `"active"`, `"deleted"`).
   * @param params.space - Optional namespace to filter by. Defaults to `"default"` if omitted.
   * @param params.type - Filter by node type (`"file"` or `"folder"`).
   * @param params.limit - Maximum number of nodes to return per page.
   * @param params.cursor - Pagination cursor from a previous `ListNodesResponse.next_cursor`.
   * @returns Paginated list of node records.
   */
  async list(params?: {
    connection_id?: string;
    parent_id?: string | null;
    status?: string;
    space?: string;
    type?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ListNodesResponse> {
    const query: Record<string, string> = {};
    if (params?.connection_id) query.connection_id = params.connection_id;
    if (params?.parent_id !== undefined) query.parent_id = params.parent_id === null ? "null" : params.parent_id;
    if (params?.status) query.status = params.status;
    if (params?.space) query.space = params.space;
    if (params?.type) query.type = params.type;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;
    return this.http.get<ListNodesResponse>("/v1/nodes", query);
  }

  /**
   * Retrieve a single node by ID.
   *
   * @param id - The node's unique identifier (UUID).
   * @returns The full node record.
   * @throws {NotFoundError} If the node does not exist.
   */
  async get(id: string): Promise<NodeRecord> {
    return this.http.get<NodeRecord>(`/v1/nodes/${id}`);
  }

  /**
   * Delete a node.
   *
   * @param id - The node's unique identifier (UUID).
   * @throws {NotFoundError} If the node does not exist.
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/nodes/${id}`);
  }

  /**
   * Get a signed download URL for a file node.
   *
   * Returns a temporary signed URL for direct download from the storage
   * provider. Roset never proxies file bytes.
   *
   * @param id - The node's unique identifier (UUID). Must be a file, not a folder.
   * @returns Object containing the signed download URL.
   * @throws {NotFoundError} If the node does not exist.
   */
  async download(id: string): Promise<{ url: string }> {
    return this.http.get<{ url: string }>(`/v1/nodes/${id}/download`);
  }

  /**
   * Initiate a file upload to a connected storage bucket.
   *
   * Creates a new file node and returns a signed upload URL. PUT your file
   * bytes directly to the returned URL.
   *
   * @param connectionId - The connection ID to upload to.
   * @param params - Upload parameters.
   * @param params.parent_id - Optional parent folder ID. Omit for root-level upload.
   * @param params.filename - Name for the new file.
   * @param params.content_type - Optional MIME type.
   * @param params.size_bytes - Optional file size in bytes.
   * @returns The created node record and a signed upload URL.
   * @throws {NotFoundError} If the connection does not exist.
   */
  async upload(connectionId: string, params: {
    parent_id?: string;
    filename: string;
    content_type?: string;
    size_bytes?: number;
  }): Promise<{ node: NodeRecord; upload_url: string }> {
    return this.http.post<{ node: NodeRecord; upload_url: string }>(
      `/v1/connections/${connectionId}/upload`,
      params,
    );
  }

  /**
   * Move a node to a different parent folder and/or rename it.
   *
   * @param id - The node's unique identifier (UUID).
   * @param params - Move parameters. At least one of `parent_id` or `name` must be provided.
   * @param params.parent_id - New parent folder ID.
   * @param params.name - New name for the node.
   * @returns The updated node record.
   * @throws {NotFoundError} If the node or target parent does not exist.
   */
  async move(id: string, params: { parent_id?: string; name?: string }): Promise<NodeRecord> {
    return this.http.patch<NodeRecord>(`/v1/nodes/${id}`, params);
  }

  /**
   * Rename a node without moving it.
   *
   * @param id - The node's unique identifier (UUID).
   * @param name - The new display name.
   * @returns The updated node record.
   * @throws {NotFoundError} If the node does not exist.
   */
  async rename(id: string, name: string): Promise<NodeRecord> {
    return this.http.patch<NodeRecord>(`/v1/nodes/${id}`, { name });
  }

  /**
   * List direct children of a folder node with optional pagination.
   *
   * Convenience wrapper around {@link list} that filters by `parent_id`.
   *
   * @param parentId - The parent folder's unique identifier (UUID).
   * @param params - Optional pagination parameters.
   * @param params.page - Page number (1-based).
   * @param params.pageSize - Number of items per page.
   * @param params.status - Filter by node status.
   * @returns Paginated list of child node records.
   */
  async listChildren(parentId: string, params?: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<ListNodesResponse> {
    const query: Record<string, string> = { parent_id: parentId };
    if (params?.page) query.page = String(params.page);
    if (params?.pageSize) query.limit = String(params.pageSize);
    if (params?.status) query.status = params.status;
    return this.http.get<ListNodesResponse>("/v1/nodes", query);
  }

  /**
   * Search for nodes by name or content within a connection.
   *
   * @param query - Search query string to match against node names.
   * @param params - Optional search filters.
   * @param params.connection_id - Limit search to a specific connection.
   * @param params.type - Filter by node type (`"file"` or `"folder"`).
   * @param params.limit - Maximum number of results to return.
   * @returns List of matching node records.
   */
  async search(query: string, params?: {
    connection_id?: string;
    type?: string;
    limit?: number;
  }): Promise<ListNodesResponse> {
    const q: Record<string, string> = { q: query };
    if (params?.connection_id) q.connection_id = params.connection_id;
    if (params?.type) q.type = params.type;
    if (params?.limit) q.limit = String(params.limit);
    return this.http.get<ListNodesResponse>("/v1/nodes/search", q);
  }
}
