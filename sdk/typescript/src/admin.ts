import { HttpClient } from "./http.js";
import { OrgResource } from "./resources/org.js";
import { IntegrationsResource } from "./resources/integrations.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { BillingResource } from "./resources/billing.js";
import { TenantResource } from "./resources/tenant.js";
import { UserResource } from "./resources/user.js";
import type { RosetClientConfig } from "./types.js";

/**
 * Roset Admin Client
 * Control plane management (Org, Billing, Integrations)
 */
export class RosetAdmin {
  private readonly http: HttpClient;
  private readonly config: RosetClientConfig;

  /** Org resource - tenant and API key management */
  public readonly org: OrgResource;

  /** Integrations resource - cloud provider connections */
  public readonly integrations: IntegrationsResource;

  /** Webhooks resource - webhook endpoint management */
  public readonly webhooks: WebhooksResource;

  /** Billing resource - plan, usage, and limits */
  public readonly billing: BillingResource;

  /** Tenant resource - stats and metadata */
  public readonly tenant: TenantResource;

  /** User resource - profile and preferences */
  public readonly user: UserResource;

  constructor(config: RosetClientConfig) {

    if (config.getAccessToken) {
      throw new Error("RosetAdmin requires apiKey, not getAccessToken");
    }

    if (!config.apiKey) {
      throw new Error("apiKey is required for RosetAdmin");
    }

    this.config = config;
    this.http = new HttpClient(config);

    // Initialize admin resources
    this.org = new OrgResource(this.http, config);
    this.integrations = new IntegrationsResource(this.http, config);
    this.webhooks = new WebhooksResource(this.http, config);
    this.billing = new BillingResource(this.http, config);
    this.tenant = new TenantResource(this.http, config);
    this.user = new UserResource(this.http, config);
  }
}

