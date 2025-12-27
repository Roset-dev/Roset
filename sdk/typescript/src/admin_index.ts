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

// Export types relevant to Admin
export type {
  Tenant,
  Member,
  Invitation,
  ApiKey,
  Integration
} from "./types.js";
