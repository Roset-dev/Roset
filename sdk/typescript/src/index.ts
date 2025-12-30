/**
 * Roset SDK - TypeScript client for the Roset API
 *
 * @example
 * ```typescript
 * import { RosetClient } from '@roset/sdk';
 *
 * const client = new RosetClient({
 *   apiKey: 'dk_...',
 * });
 *
 * // Resolve paths
 * const nodes = await client.nodes.resolve(['/documents', '/images']);
 *
 * // Upload a file
 * const file = await client.uploads.upload('/documents/report.pdf', buffer, {
 *   contentType: 'application/pdf',
 * });
 *
 * // Create a share link
 * const share = await client.shares.create(file.id, { expiresIn: '7d' });
 * ```
 */

// Resources
export { RosetClient } from "./client.js";
export { NodesResource } from "./resources/nodes.js";
export { UploadsResource } from "./resources/uploads.js";
export { SharesResource } from "./resources/shares.js";
export { AuditResource } from "./resources/audit.js";
export { MountsResource } from "./resources/mounts.js";
export { LeasesResource } from "./resources/leases.js";
export { CommitsResource } from "./resources/commits.js";
export { RefsResource } from "./resources/refs.js";
export { OrgResource } from "./resources/org.js";
export { IntegrationsResource } from "./resources/integrations.js";
export { SearchResource } from "./resources/search.js";
export { TenantResource, type TenantStats } from "./resources/tenant.js";
export { UserResource, type UserProfile, type UserProfileUpdate } from "./resources/user.js";
export { NotificationsResource, type Notification, type NotificationsListResult, type NotificationSettings } from "./resources/notifications.js";
export { WebhooksResource, type Webhook, type WebhookEvent, type WebhookDelivery, type CreateWebhookOptions, type UpdateWebhookOptions } from "./resources/webhooks.js";
export { BillingResource } from "./resources/billing.js";

// Types
export type {
  RosetClientConfig,
  RequestOptions,
  PaginatedResult,
  PaginationOptions,
} from "./types.js";

export type {
  Node,
  FileVersion,
  Share,
  AuditOp,
  ResolveResult,
  UploadResult,
  DownloadResult,
  Commit,
  CommitOptions,
  Ref,
  CompareResult,
  FileDiff,
  Tenant,
  Member,
  Invitation,
  ApiKey,
  Integration,
  Mount,
  CreateMountOptions,
  UpdateMountOptions,
  SearchResult,
  SearchFilters,
} from "./types.js";

// Errors
export {
  RosetError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  RateLimitError,
  QuotaExceededError,
} from "./errors.js";
