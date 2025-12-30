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

export interface Share {
  id: string;
  tenantId: string;
  nodeId: string;
  token: string;
  scope: "read" | "write";
  url?: string;
  hasPassword: boolean;
  maxDownloads: number | null;
  downloadCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdBy: string | null;
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

  /** Recipient email (optional) */
  recipient?: string;
}

export interface ShareAccessResult {
  node: Node;
  children?: Node[];
  downloadUrl?: string;
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

export interface Commit {
  id: string;
  nodeId: string;
  manifestStorageKey: string;
  message: string | null;
  stats: {
    fileCount: number;
    totalSize: number;
    metrics?: Record<string, number>;
  };
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface CommitOptions {
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface Ref {
  name: string;
  targetNodeId: string;
  commitId: string | null;
  updatedAt: string;
}

export interface FileDiff {
  path: string;
  name: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  sizeA?: number;
  sizeB?: number;
  checksumA?: string;
  checksumB?: string;
  isTextFile: boolean;
}

export interface CompareResult {
  summary: {
    added: number;
    removed: number;
    changed: number;
    sizeDelta: number;
    sizeDeltaPercent: number;
  };
  files: FileDiff[];
  metrics?: Record<string, { valA: number; valB: number; delta: number; improved: boolean | null }>;
}

// ============================================================================
// Org Management Types
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  clerkOrgId: string | null;
  effectivePlan: string;
  billingStatus: string;
  periodEnd: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  tenantId: string;
  principalId: string;
  email: string | null;
  name: string | null;
  role: string;
  invitedBy: string | null;
  joinedAt: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  invitedBy: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  url?: string;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface Integration {
  id: string;
  provider: 'aws' | 'gcp' | 'azure' | 'supabase';
  status: 'connected' | 'pending' | 'errored';
  lastSyncedAt: string | null;
  createdAt: string;
}

// ============================================================================
// Mount Types
// ============================================================================

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

export type PlanTier = "free" | "starter" | "team" | "scale" | "enterprise";

export interface BillingUsage {
  managedFiles: number;
  apiCalls: number;
  mountOps: number;
  connectors: number;
  activeDevices: number;
  mounts: number;
  teamMembers: number;
}

export interface BillingLimits {
  apiCalls: number;
  managedFiles: number;
  connectors: number;
  activeDevices: number;
  mounts: number;
  mountOps: number;
  teamMembers: number;
}

export interface BillingTrend {
  managedFiles?: {
    growth: number;
    history: number[];
  };
  apiCalls?: {
    growth: number;
    history: number[];
  };
}

export interface BillingInfo {
  plan: PlanTier;
  usage: BillingUsage;
  limits: BillingLimits;
  trend?: BillingTrend;
  periodEnd: string;
}

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
