import { HttpClient } from "./http.js";
import { OrgResource } from "./resources/org.js";
import { IntegrationsResource } from "./resources/integrations.js";
import { WebhooksResource } from "./resources/webhooks.js";
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

  constructor(config: RosetClientConfig) {
    if (!config.baseUrl) {
      throw new Error("baseUrl is required");
    }
    if (!config.apiKey) {
      throw new Error("apiKey is required");
    }

    this.config = config;
    this.http = new HttpClient(config);

    // Initialize admin resources
    this.org = new OrgResource(this.http, config);
    this.integrations = new IntegrationsResource(this.http, config);
    this.webhooks = new WebhooksResource(this.http, config);
  }
}
