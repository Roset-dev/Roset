/**
 * Roset Admin SDK
 * 
 * @example
 * ```typescript
 * import { RosetAdmin } from '@roset/sdk/admin';
 * 
 * const admin = new RosetAdmin({ ... });
 * await admin.org.inviteMember('user@example.com', 'editor');
 * ```
 */

export { RosetAdmin } from "./admin.js";
export { OrgResource } from "./resources/org.js";
export { IntegrationsResource } from "./resources/integrations.js";
export { WebhooksResource } from "./resources/webhooks.js";
export { BillingResource } from "./resources/billing.js";
export { UserResource } from "./resources/user.js";
export type { UserProfile, UserProfileUpdate } from "./resources/user.js";
export type { Webhook, WebhookEvent, WebhookDelivery, CreateWebhookOptions, UpdateWebhookOptions, RotateWebhookSecretOptions } from "./resources/webhooks.js";

// Export types relevant to Admin
export type {
  Tenant,
  Member,
  Invitation,
  ApiKey,
  Integration,
} from "./types.js";

// Errors
export {
  RosetError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  RateLimitError,
} from "./errors.js";

