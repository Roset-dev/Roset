/**
 * Nodes Resource - Path resolution, CRUD, and move operations
 */

import type { HttpClient } from "../http.js";
import type {
  RosetClientConfig,
  RequestOptions,
  PaginationOptions,
  PaginatedResult,
  Node,
  NodeWithVersion,
  ResolveResult,
} from "../types.js";

export interface ListChildrenOptions extends PaginationOptions {
  /** Filter by type */
  type?: "file" | "folder";
}

export interface CreateNodeOptions {
  /** Parent folder ID */
  parentId?: string;

  /** Parent path (alternative to parentId) */
  parentPath?: string;

  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Idempotency key */
  idempotencyKey?: string;
}

export interface UpdateNodeOptions {
  /** New name */
  name?: string;

  /** New parent ID (for move) */
  parentId?: string;

  /** Updated metadata */
  metadata?: Record<string, unknown>;

  /** Idempotency key */
  idempotencyKey?: string;
}

export class NodesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Resolve multiple paths to nodes
   *
   * @example
   * ```typescript
   * const result = await client.nodes.resolve(['/documents', '/images/photo.jpg']);
   * // result = { '/documents': {...}, '/images/photo.jpg': {...} }
   * ```
   */
  async resolve(paths: string[], options?: RequestOptions): Promise<ResolveResult> {
    return this.http.post<ResolveResult>("/v1/resolve", { paths }, options);
  }

  /**
   * Resolve a single path to a node
   */
  async resolvePath(path: string, options?: RequestOptions): Promise<Node | null> {
    const result = await this.resolve([path], options);
    return result[path] ?? null;
  }

  /**
   * Get a node by ID
   */
  async get(id: string, options?: RequestOptions): Promise<NodeWithVersion> {
    return this.http.get<NodeWithVersion>(`/v1/nodes/${id}`, options);
  }

  /**
   * Get multiple nodes by ID in a single request (batch stat)
   *
   * @example
   * ```typescript
   * const result = await client.nodes.statMany(['id1', 'id2', 'id3']);
   * // result = { 'id1': {...}, 'id2': {...}, 'id3': null }
   * ```
   */
  async statMany(
    ids: string[],
    options?: RequestOptions
  ): Promise<Record<string, Node | null>> {
    return this.http.post<Record<string, Node | null>>(
      "/v1/nodes/batch/stat",
      { ids },
      options
    );
  }


  /**
   * List children of a folder
   */
  async listChildren(
    nodeId: string,
    options?: ListChildrenOptions & RequestOptions
  ): Promise<PaginatedResult<Node>> {
    const params = new URLSearchParams();

    if (options?.page) params.set("page", String(options.page));
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
    if (options?.sortBy) params.set("sortBy", options.sortBy);
    if (options?.sortOrder) params.set("sortOrder", options.sortOrder);
    if (options?.type) params.set("type", options.type);

    const query = params.toString();
    const path = `/v1/nodes/${nodeId}/children${query ? `?${query}` : ""}`;

    return this.http.get<PaginatedResult<Node>>(path, options);
  }

  /**
   * Create a new file or folder
   *
   * @example
   * ```typescript
   * // Create folder
   * const folder = await client.nodes.create('My Folder', 'folder', {
   *   parentPath: '/documents',
   * });
   *
   * // Create file placeholder (use uploads for actual file content)
   * const file = await client.nodes.create('report.pdf', 'file', {
   *   parentId: folder.id,
   * });
   * ```
   */
  async create(
    name: string,
    type: "file" | "folder",
    options?: CreateNodeOptions & RequestOptions
  ): Promise<Node> {
    return this.http.post<Node>(
      "/v1/nodes",
      {
        name,
        type,
        parentId: options?.parentId,
        parentPath: options?.parentPath,
        metadata: options?.metadata,
      },
      {
        idempotencyKey: options?.idempotencyKey,
        ...options,
      }
    );
  }

  /**
   * Create a folder (convenience method)
   */
  async createFolder(
    name: string,
    options?: CreateNodeOptions & RequestOptions
  ): Promise<Node> {
    return this.create(name, "folder", options);
  }

  /**
   * Update a node (rename, move, or update metadata)
   *
   * @example
   * ```typescript
   * // Rename
   * await client.nodes.update(nodeId, { name: 'New Name' });
   *
   * // Move to different folder
   * await client.nodes.update(nodeId, { parentId: newFolderId });
   *
   * // Rename and move atomically
   * await client.nodes.update(nodeId, { name: 'New Name', parentId: newFolderId });
   * ```
   */
  async update(
    id: string,
    updates: UpdateNodeOptions,
    options?: RequestOptions
  ): Promise<Node> {
    return this.http.patch<Node>(
      `/v1/nodes/${id}`,
      {
        name: updates.name,
        parentId: updates.parentId,
        metadata: updates.metadata,
      },
      {
        idempotencyKey: updates.idempotencyKey,
        ...options,
      }
    );
  }

  /**
   * Rename a node (convenience method)
   */
  async rename(id: string, newName: string, options?: RequestOptions): Promise<Node> {
    return this.update(id, { name: newName }, options);
  }

  /**
   * Move a node to a different folder (convenience method)
   */
  async move(
    id: string,
    newParentId: string,
    newName?: string,
    options?: RequestOptions
  ): Promise<Node> {
    return this.update(id, { parentId: newParentId, name: newName }, options);
  }

  /**
   * Delete a node (soft delete - moves to trash)
   */
  async delete(id: string, options?: RequestOptions): Promise<void> {
    await this.http.delete(`/v1/nodes/${id}`, options);
  }

  /**
   * Restore a node from trash
   */
  async restore(id: string, options?: RequestOptions): Promise<Node> {
    return this.http.post<Node>(`/v1/nodes/${id}/restore`, undefined, options);
  }

  /**
   * Batch delete nodes
   */
  async deleteMany(ids: string[], options?: RequestOptions): Promise<void> {
    await this.http.post("/v1/nodes/batch/delete", { ids }, options);
  }

  /**
   * Batch move nodes
   */
  async moveMany(
    ids: string[],
    newParentId: string,
    options?: RequestOptions
  ): Promise<Node[]> {
    return this.http.post<Node[]>(
      "/v1/nodes/batch/move",
      { ids, parentId: newParentId },
      options
    );
  }

  /**
   * Copy a node to a new location
   * 
   * Creates a copy of the node (file or folder) in the destination folder.
   * For files, content is not copied - only the node structure.
   * 
   * @example
   * ```typescript
   * const result = await client.nodes.copy('source-id', 'dest-folder-id');
   * console.log(result.node.id); // New node ID
   * ```
   */
  async copy(
    nodeId: string,
    destinationParentId: string,
    newName?: string,
    options?: RequestOptions
  ): Promise<{ node: Node; message: string }> {
    return this.http.post<{ node: Node; message: string }>(
      "/v1/nodes/copy",
      { nodeId, destinationParentId, newName },
      options
    );
  }

  // ============================================================================
  // Trash Management
  // ============================================================================

  /**
   * Permanently delete a node (from trash)
   * 
   * @example
   * ```typescript
   * // Node must be in trash first
   * await client.nodes.delete(nodeId);
   * 
   * // Then permanently delete
   * await client.nodes.permanentDelete(nodeId);
   * ```
   */
  async permanentDelete(id: string, options?: RequestOptions): Promise<void> {
    await this.http.delete(`/v1/nodes/${id}/permanent`, options);
  }

  /**
   * Batch permanently delete nodes (from trash)
   */
  async permanentDeleteMany(ids: string[], options?: RequestOptions): Promise<void> {
    await this.http.post("/v1/nodes/batch/permanent-delete", { ids }, options);
  }

  /**
   * List trash items
   * 
   * @example
   * ```typescript
   * const { items, total, hasMore } = await client.nodes.listTrash({ pageSize: 50 });
   * for (const item of items) {
   *   console.log(`${item.name} deleted at ${item.deletedAt}`);
   * }
   * ```
   */
  async listTrash(options?: PaginationOptions & RequestOptions): Promise<PaginatedResult<Node>> {
    const params = new URLSearchParams();

    if (options?.page) params.set("page", String(options.page));
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
    if (options?.sortBy) params.set("sortBy", options.sortBy);
    if (options?.sortOrder) params.set("sortOrder", options.sortOrder);

    const query = params.toString();
    const path = `/v1/trash${query ? `?${query}` : ""}`;

    return this.http.get<PaginatedResult<Node>>(path, options);
  }

  /**
   * Empty trash (permanently delete all trashed items)
   * 
   * @returns The count of items deleted
   * 
   * @example
   * ```typescript
   * const { deletedCount } = await client.nodes.emptyTrash();
   * console.log(`Permanently deleted ${deletedCount} items`);
   * ```
   */
  /**
   * Empty trash (permanently delete all trashed items)
   * 
   * @returns The count of items deleted
   * 
   * @example
   * ```typescript
   * const { deletedCount } = await client.nodes.emptyTrash();
   * console.log(`Permanently deleted ${deletedCount} items`);
   * ```
   */
  async emptyTrash(options?: RequestOptions): Promise<{ deletedCount: number }> {
    return this.http.delete<{ deletedCount: number }>("/v1/trash", options);
  }

  // ============================================================================
  // Convenience Core FS Operations
  // ============================================================================

  /**
   * List children at a path (convenience wrapper around resolve + listChildren)
   * 
   * @example
   * ```typescript
   * const { items } = await client.nodes.list('/documents');
   * ```
   */
  async list(
    path: string,
    options?: ListChildrenOptions & RequestOptions
  ): Promise<PaginatedResult<Node>> {
    const node = await this.resolvePath(path, options);
    if (!node) {
      throw new Error(`Path not found: ${path}`);
    }
    return this.listChildren(node.id, options);
  }

  /**
   * Stat a node by path (get metadata without children)
   * 
   * @example
   * ```typescript
   * const node = await client.nodes.stat('/documents/report.pdf');
   * ```
   */
  async stat(path: string, options?: RequestOptions): Promise<Node | null> {
    return this.resolvePath(path, options);
  }

  /**
   * Check if a path exists
   * 
   * @example
   * ```typescript
   * if (await client.nodes.exists('/documents')) { ... }
   * ```
   */
  async exists(path: string, options?: RequestOptions): Promise<boolean> {
    const node = await this.resolvePath(path, options);
    return !!node;
  }

  /**
   * Create nested folder structure (like mkdir -p)
   * 
   * @example
   * ```typescript
   * await client.nodes.mkdirp('/projects/2025/q1');
   * ```
   */
  async mkdirp(path: string, options?: RequestOptions): Promise<Node> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const parts = normalizedPath.split("/").filter(Boolean);
    
    let currentPath = "";
    let lastNode: Node | null = null;

    for (const part of parts) {
      currentPath += `/${part}`;
      const existing = await this.resolvePath(currentPath, options);
      
      if (existing) {
        if (existing.type !== "folder") {
          throw new Error(`Path component is not a folder: ${currentPath}`);
        }
        lastNode = existing;
      } else {
        lastNode = await this.createFolder(part, {
          parentId: lastNode?.id,
          ...options,
        });
      }
    }

    if (!lastNode) {
      throw new Error("Failed to create folder structure");
    }

    return lastNode;
  }

  // ===========================================================================
  // FILE VERSIONS
  // ===========================================================================

  /**
   * List all versions of a file
   * 
   * @example
   * ```typescript
   * const { versions } = await client.nodes.listVersions('file-id');
   * versions.forEach(v => console.log(v.createdAt, v.size));
   * ```
   */
  async listVersions(nodeId: string, options?: RequestOptions): Promise<{ versions: FileVersionInfo[] }> {
    return this.http.get<{ versions: FileVersionInfo[] }>(`/v1/nodes/${nodeId}/versions`, options);
  }

  /**
   * Restore a file to a specific version
   * 
   * Creates a new version that is a copy of the target version.
   * 
   * @example
   * ```typescript
   * await client.nodes.restoreVersion('file-id', 42);
   * ```
   */
  async restoreVersion(
    nodeId: string, 
    versionId: number, 
    options?: RequestOptions
  ): Promise<{ message: string; restoredVersionId: number; newVersionId: number }> {
    return this.http.post<{ message: string; restoredVersionId: number; newVersionId: number }>(
      `/v1/nodes/${nodeId}/versions/${versionId}/restore`,
      {},
      options
    );
  }
}

export interface FileVersionInfo {
  id: number;
  nodeId: string;
  storageKey: string;
  etag: string | null;
  size: number;
  contentType: string | null;
  sha256: string | null;
  isCurrent: boolean;
  createdAt: string;
  createdBy: string | null;
}
