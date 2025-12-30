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
   * Start a connection flow for a cloud provider.
   * Returns an action plan (OAuth URL, install link, or manual setup instructions).
   */
  async startConnect(provider: string): Promise<import("../types.js").StartConnectResponse> {
    const response = await this.http.post<import("../types.js").StartConnectResponse>(
      `/v1/integrations/${provider}/start`,
      {}
    );
    return response;
  }

  /**
   * Verify an integration (Manual/Install flow)
   */
  async verify(id: string, data: Record<string, unknown>): Promise<{ success: boolean; integration_id: string }> {
    return await this.http.post<{ success: boolean; integration_id: string }>(
      `/v1/integrations/${id}/verify`,
      data
    );
  }

  /**
   * Disconnect/Revoke an integration
   */
  async disconnect(id: string): Promise<void> {
    await this.http.delete(`/v1/integrations/${id}`);
  }
}
