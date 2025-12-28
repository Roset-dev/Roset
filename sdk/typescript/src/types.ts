/**
 * SDK Types
 */

// ============================================================================
// Client Configuration
// ============================================================================

export interface RosetClientConfig {
  /** Base URL of the Roset API (e.g., 'https://api.roset.dev') */
  baseUrl: string;

  /** API key for authentication */
  apiKey: string;

  /** Default tenant ID (optional, derived from API key if not specified) */
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
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface Member {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  joinedAt: string;
}

export interface Invitation {
  email: string;
  role: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
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

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResult {
  node: Node;
  score: number;
  highlights: Record<string, string[]>;
}

export interface SearchFilters {
  mode?: 'metadata' | 'fulltext';
  type?: 'file' | 'folder';
  parentId?: string;
  extensions?: string[];
  minSize?: number;
  maxSize?: number;
  dateRange?: {
    start?: string | Date;
    end?: string | Date;
  };
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
  teamMembers: number;
}

export interface BillingLimits {
  apiCalls: number;
  managedFiles: number;
  connectors: number;
  activeDevices: number;
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
