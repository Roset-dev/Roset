import type { components } from "./generated/models.js";

/**
 * SDK Types
 */

// ============================================================================
// Client Configuration
// ============================================================================

export interface RosetClientConfig {

  /** API key for authentication (mutually exclusive with getAccessToken) */
  apiKey?: string;

  /** 
   * Callback to get a fresh access token for Bearer auth.
   * Called before each request. Should return a JWT/session token.
   * Mutually exclusive with apiKey.
   * 
   * @example
   * ```ts
   * const client = new RosetClient({
   *   getAccessToken: async () => await authProvider.getToken(),
   * });
   * ```
   */
  getAccessToken?: () => Promise<string | null> | string | null;

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

  /** Idempotency key for mutation requests. Pass null to disable auto-generated key. */
  idempotencyKey?: string | null;

  /** Abort signal for request cancellation */
  signal?: AbortSignal;

  /** Additional headers */
  headers?: Record<string, string>;

  /** Per-request mount override */
  mount?: string;
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

export type Node = Exclude<components["schemas"]["Node"], null>;
export type FileVersion = Exclude<components["schemas"]["FileVersion"], null>;
export type NodeWithVersion = components["schemas"]["NodeWithVersion"];

export interface ResolveResult {
  [path: string]: Node | null;
}

// ============================================================================
// Upload Types
// ============================================================================

export type UploadInitResult = Exclude<components["schemas"]["UploadInitResult"], null>;
export type UploadResult = Exclude<components["schemas"]["UploadCommitResult"], null>;
export type DownloadResult = Exclude<components["schemas"]["DownloadUrl"], null>;

export interface UploadOptions {
  name?: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
  size?: number;
  multipart?: boolean;
  expectedSha256?: string;
  parentId?: string;
  parentPath?: string;
  nodeId?: string;
}

// ============================================================================
// Share Types
// ============================================================================

export type Share = Exclude<components["schemas"]["Share"], null>;
export type ShareAccessResult = Exclude<components["schemas"]["ShareAccessResult"], null>;
export type SharePasswordRequired = Exclude<components["schemas"]["SharePasswordRequired"], null>;

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

  /** Recipient email (optional) */
  recipient?: string;
}

// ============================================================================
// Audit Types
// ============================================================================

export type AuditOp = Exclude<components["schemas"]["AuditLogEntry"], null>;

export interface AuditQueryOptions extends PaginationOptions {
  action?: string;
  actorId?: string;
  nodeId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

// ============================================================================
// ML Control Plane Types
// ============================================================================

export type Commit = components["schemas"]["Commit"];
export type CommitSummary = Exclude<components["schemas"]["CommitSummary"], null>;

export interface CommitOptions {
  message?: string;
  metadata?: Record<string, unknown>;
}

export type Ref = components["schemas"]["Ref"];

export type FileDiff = components["schemas"]["FileDiff"];

export type CompareResult = components["schemas"]["CompareResult"];

// ============================================================================
// Org Management Types
// ============================================================================

export type TenantStats = Exclude<components["schemas"]["TenantStats"], null>;

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export type Member = Exclude<components["schemas"]["Member"], null>;
export type Invitation = Exclude<components["schemas"]["Invite"], null>;
export type InvitationInfo = Exclude<components["schemas"]["InviteInfo"], null>;
export type InvitationResult = Exclude<components["schemas"]["InviteResult"], null>;

export type ApiKey = Exclude<components["schemas"]["ApiKey"], null>;
export type ApiKeyWithSecret = Exclude<components["schemas"]["ApiKeyWithSecret"], null>;

export interface Integration {
  id: string;
  provider: 'aws' | 'gcp' | 'azure' | 'supabase' | 'cloudflare' | 'minio';
  connectMethod: 'oauth' | 'install' | 'manual';
  status: 'connected' | 'pending' | 'errored' | 'revoked';
  lastSyncedAt: string | null;
  createdAt: string;
}

// ============================================================================
// Mount Types
// ============================================================================

export type StartConnectResult =
  | { kind: 'oauth'; authUrl: string }
  | { kind: 'install'; launchUrl: string; afterInstall?: { verifyEndpoint: string } }
  | { kind: 'manual'; setupPath: string; fields?: unknown[] };

export interface StartConnectResponse {
  integration_id: string;
  action: StartConnectResult;
}

export type Mount = Exclude<components["schemas"]["Mount"], null>;

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

// ============================================================================
// Search Types
// ============================================================================

export type SearchResult = Exclude<components["schemas"]["SearchResult"], null>;
export type QuickSearch = Exclude<components["schemas"]["QuickSearch"], null>;

export interface SearchFilters {
  mode?: "metadata" | "fulltext";
  type?: "file" | "folder";
  folderId?: string;
  contentType?: string;
  minSize?: number;
  maxSize?: number;
  startDate?: string | Date;
  endDate?: string | Date;
}

// ============================================================================
// Billing Types
// ============================================================================

export type BillingInfo = Exclude<components["schemas"]["BillingUsage"], null>;

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
}

// ============================================================================
// User & Notifications
// ============================================================================

export type UserProfile = Exclude<components["schemas"]["UserProfile"], null>;
export type Notification = Exclude<components["schemas"]["Notification"], null>;
export type NotificationList = Exclude<components["schemas"]["NotificationList"], null>;
export type NotificationSettings = Exclude<components["schemas"]["NotificationSettings"], null>;

// ============================================================================
// API Response Types
// ============================================================================

export type ApiErrorResponse = Exclude<components["schemas"]["ErrorResponse"], null>;
