/**
 * Audit Resource - Operation log queries
 */

import type { HttpClient } from "../http.js";
import type {
  RosetClientConfig,
  RequestOptions,
  PaginatedResult,
  AuditOp,
  AuditQueryOptions,
} from "../types.js";

export class AuditResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Query audit log
   *
   * @example
   * ```typescript
   * // Get recent operations
   * const { items } = await client.audit.query();
   *
   * // Filter by action
   * const { items } = await client.audit.query({
   *   action: 'upload',
   *   startDate: new Date('2025-01-01'),
   * });
   *
   * // Filter by actor
   * const { items } = await client.audit.query({ actorId: 'user-123' });
   * ```
   */
  async query(
    options?: AuditQueryOptions & RequestOptions
  ): Promise<PaginatedResult<AuditOp>> {
    const params = new URLSearchParams();

    if (options?.page) params.set("page", String(options.page));
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
    if (options?.sortBy) params.set("sortBy", options.sortBy);
    if (options?.sortOrder) params.set("sortOrder", options.sortOrder);
    if (options?.action) params.set("action", options.action);
    if (options?.actorId) params.set("actorId", options.actorId);
    if (options?.nodeId) params.set("nodeId", options.nodeId);

    if (options?.startDate) {
      const date =
        options.startDate instanceof Date
          ? options.startDate.toISOString()
          : options.startDate;
      params.set("startDate", date);
    }

    if (options?.endDate) {
      const date =
        options.endDate instanceof Date ? options.endDate.toISOString() : options.endDate;
      params.set("endDate", date);
    }

    const query = params.toString();
    const path = `/v1/audit${query ? `?${query}` : ""}`;

    return this.http.get<PaginatedResult<AuditOp>>(path, options);
  }

  /**
   * Get audit log for a specific node
   */
  async forNode(nodeId: string, options?: RequestOptions): Promise<AuditOp[]> {
    const result = await this.http.get<{ items: AuditOp[] }>(
      `/v1/nodes/${nodeId}/audit`,
      options
    );
    return result.items;
  }

  /**
   * Async iterator for paginating through audit logs
   *
   * @example
   * ```typescript
   * for await (const op of client.audit.iterate({ action: 'upload' })) {
   *   console.log(op.action, op.targetNodeId);
   * }
   * ```
   */
  async *iterate(
    options?: AuditQueryOptions & RequestOptions
  ): AsyncGenerator<AuditOp, void, undefined> {
    let page = options?.page ?? 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.query({ ...options, page });
      for (const item of result.items) {
        yield item;
      }
      hasMore = result.hasMore;
      page++;
    }
  }
}
