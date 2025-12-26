/**
 * SDK Types
 */

// ============================================================================
// Client Configuration
// ============================================================================

export interface RosetClientConfig {
  /** Base URL of the Roset API (e.g., 'https://api.roset.io') */
  baseUrl: string;

  /** API key for authentication */
  apiKey: string;

  /** Default tenant ID (optional if using tenant-scoped API keys) */
  tenantId?: string;

  /** Default mount ID (optional, uses default mount if not specified) */
  mountId?: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Number of retries for failed requests (default: 3) */
  retries?: number;

  /** Custom fetch implementation (for testing or environments without global fetch) */
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions {
  /** Override timeout for this request */
  timeout?: number;

  /** Idempotency key for mutation requests */
  idempotencyKey?: string;

  /** Abort signal for request cancellation */
  signal?: AbortSignal;

  /** Additional headers */
  headers?: Record<string, string>;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationOptions {
  /** Page number (1-indexed) */
  page?: number;

  /** Items per page (default: 50, max: 100) */
  pageSize?: number;

  /** Sort field */
  sortBy?: string;

  /** Sort order */
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Node Types
// ============================================================================

export interface Node {
  id: string;
  tenantId: string;
  mountId: string;
  parentId: string | null;
  name: string;
  type: "file" | "folder";
  path?: string;
  size?: number;
  contentType?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FileVersion {
  id: string;
  nodeId: string;
  storageKey: string;
  etag: string | null;
  size: number;
  contentType: string | null;
  isCurrent: boolean;
  createdAt: string;
  createdBy?: string | null;
}

export interface NodeWithVersion extends Node {
  version?: FileVersion;
}

export interface ResolveResult {
  [path: string]: Node | null;
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadInitResult {
  uploadUrl: string;
  uploadToken: string;
  nodeId: string;
  expiresIn: number;
}

export interface UploadResult {
  node: Node;
}

export interface DownloadResult {
  url: string;
  contentType: string | null;
  size: number;
  expiresIn: number;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Share Types
// ============================================================================

export interface Share {
  id: string;
  nodeId: string;
  token: string;
  scope: "read" | "write";
  url: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateShareOptions {
  /** Share scope */
  scope?: "read" | "write";

  /** Expiration (ISO string, Date, or duration like '7d', '24h') */
  expiresAt?: string | Date;

  /** Expiration duration shorthand */
  expiresIn?: string;

  /** Password protection */
  password?: string;

  /** Maximum number of downloads */
  maxDownloads?: number;
}

export interface ShareAccessResult {
  node: Node;
  children?: Node[];
  downloadUrl?: string;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditOp {
  id: string;
  tenantId: string;
  actorId: string | null;
  actorType: string;
  action: string;
  targetNodeId: string | null;
  targetType: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AuditQueryOptions extends PaginationOptions {
  action?: string;
  actorId?: string;
  nodeId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
