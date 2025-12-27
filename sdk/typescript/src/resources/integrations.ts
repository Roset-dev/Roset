import { HttpClient } from "../http.js";
import { RosetClientConfig, Integration } from "../types.js";

/**
 * Integrations Resource
 * Manage cloud storage (AWS, GCP, etc.) connections
 */
export class IntegrationsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * List active integrations
   */
  async list(): Promise<Integration[]> {
    const { integrations } = await this.http.get<{ integrations: Integration[] }>("/v1/integrations");
    return integrations;
  }

  /**
   * Connect a new cloud provider
   */
  async connect(provider: string, config: Record<string, unknown>): Promise<Integration> {
    const { integration } = await this.http.post<{ integration: Integration }>(
      "/v1/integrations",
      { provider, ...config }
    );
    return integration;
  }

  /**
   * Disconnect/Revoke an integration
   */
  async disconnect(id: string): Promise<void> {
    await this.http.delete(`/v1/integrations/${id}`);
  }
}
