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
}
