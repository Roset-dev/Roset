/**
 * RosetClient - Main SDK entry point
 */

import { HttpClient, generateIdempotencyKey } from "./http.js";
import { NodesResource } from "./resources/nodes.js";
import { UploadsResource } from "./resources/uploads.js";
import { SharesResource } from "./resources/shares.js";
import { AuditResource } from "./resources/audit.js";
import { MountsResource } from "./resources/mounts.js";
import { LeasesResource } from "./resources/leases.js";
import { CommitsResource } from "./resources/commits.js";
import { RefsResource } from "./resources/refs.js";
import { SearchResource } from "./resources/search.js";
import { UserResource } from "./resources/user.js";
import { NotificationsResource } from "./resources/notifications.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { OrgResource } from "./resources/org.js";
import { IntegrationsResource } from "./resources/integrations.js";
import { BillingResource } from "./resources/billing.js";
import { TenantResource } from "./resources/tenant.js";
import type { RosetClientConfig } from "./types.js";

export class RosetClient {
  private readonly http: HttpClient;
  private readonly config: RosetClientConfig;

  /** Nodes resource - path resolution, CRUD, move/rename */
  public readonly nodes: NodesResource;

  /** Uploads resource - file upload and download */
  public readonly uploads: UploadsResource;

  /** Shares resource - share link management */
  public readonly shares: SharesResource;

  /** Audit resource - operation log queries */
  public readonly audit: AuditResource;

  /** Mounts resource - storage backend management */
  public readonly mounts: MountsResource;

  /** Leases resource - file-level lease management */
  public readonly leases: LeasesResource;

  /** Commits resource - ML checkpoints and versioning */
  public readonly commits: CommitsResource;

  /** Refs resource - symbolic references/tags */
  public readonly refs: RefsResource;

  /** Search resource - discovery and metadata queries */
  public readonly search: SearchResource;

  /** User resource - current user profile and preferences */
  public readonly user: UserResource;

  /** Notifications resource - in-app notifications */
  public readonly notifications: NotificationsResource;

  /** Webhooks resource - webhook endpoints and delivery */
  public readonly webhooks: WebhooksResource;

  /** Org resource - workspace settings, members, API keys */
  public readonly org: OrgResource;

  /** Integrations resource - cloud provider integrations */
  public readonly integrations: IntegrationsResource;

  /** Billing resource - usage and quotas */
  public readonly billing: BillingResource;

  /** Tenant resource - tenant statistics */
  public readonly tenant: TenantResource;

  constructor(config: RosetClientConfig) {
    if (!config.apiKey && !config.getAccessToken) {
      throw new Error("Either apiKey or getAccessToken is required");
    }

    // Enforce production URL
    const finalConfig = {
      ...config,
    };

    this.config = finalConfig;
    this.http = new HttpClient(finalConfig);

    // Initialize resources
    this.nodes = new NodesResource(this.http, finalConfig);
    this.uploads = new UploadsResource(this.http, finalConfig);
    this.shares = new SharesResource(this.http, finalConfig);
    this.audit = new AuditResource(this.http, finalConfig);
    this.mounts = new MountsResource(this.http, finalConfig);
    this.leases = new LeasesResource(this.http, finalConfig);
    this.commits = new CommitsResource(this.http, finalConfig);
    this.refs = new RefsResource(this.http, finalConfig);
    this.search = new SearchResource(this.http, finalConfig);
    this.user = new UserResource(this.http, finalConfig);
    this.notifications = new NotificationsResource(this.http, finalConfig);
    this.webhooks = new WebhooksResource(this.http, finalConfig);
    this.org = new OrgResource(this.http, finalConfig);
    this.integrations = new IntegrationsResource(this.http, finalConfig);
    this.billing = new BillingResource(this.http, finalConfig);
    this.tenant = new TenantResource(this.http, finalConfig);
  }

  /**
   * Generate a unique idempotency key for mutations
   */
  static generateIdempotencyKey(): string {
    return generateIdempotencyKey();
  }

  /**
   * Get the configured mount ID
   */
  get mountId(): string | undefined {
    return this.config.mountId;
  }

  /**
   * Create a new client scoped to a specific mount
   * 
   * @example
   * ```ts
   * const s3Client = client.useMount('mount-id-here');
   * const { items } = await s3Client.nodes.list('/');
   * ```
   */
  useMount(mountId: string): RosetClient {
    return new RosetClient({
      ...this.config,
      mountId,
    });
  }

  /**
   * Create a new client with default request options overrides
   * 
   * @example
   * ```ts
   * const gcsClient = client.with({ mount: 'mount-gcs-backup' });
   * ```
   */
  with(options: { mount?: string }): RosetClient {
    return new RosetClient({
      ...this.config,
      mountId: options.mount ?? this.config.mountId,
    });
  }
}
