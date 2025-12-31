import { HttpClient } from "../http.js";
import { RosetClientConfig, Integration } from "../types.js";

/**
 * Bucket info from an integration
 */
export interface IntegrationBucket {
  id: string;
  bucketName: string;
  region: string | null;
  isImported: boolean;
  importedMountId: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Account info from an integration (contains buckets)
 */
export interface IntegrationAccount {
  id: string;
  externalId: string;
  name: string | null;
  metadata: Record<string, unknown>;
  buckets: IntegrationBucket[];
}

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
   * Sync/enumerate buckets from an integration
   * This triggers discovery of all accessible buckets
   */
  async sync(id: string): Promise<{ buckets_synced: number }> {
    return await this.http.post<{ buckets_synced: number }>(
      `/v1/integrations/${id}/sync`,
      {}
    );
  }

  /**
   * List discovered buckets for an integration
   */
  async listBuckets(id: string): Promise<{ accounts: IntegrationAccount[] }> {
    return await this.http.get<{ accounts: IntegrationAccount[] }>(
      `/v1/integrations/${id}/buckets`
    );
  }

  /**
   * Import a bucket as a mount
   */
  async importBucket(
    integrationId: string,
    bucketId: string,
    options: { name: string; isDefault?: boolean }
  ): Promise<{ id: string; name: string }> {
    return await this.http.post<{ id: string; name: string }>(
      `/v1/integrations/${integrationId}/buckets/${bucketId}/import`,
      options
    );
  }

  /**
   * Disconnect/Revoke an integration
   */
  async disconnect(id: string): Promise<void> {
    await this.http.delete(`/v1/integrations/${id}`);
  }
}

