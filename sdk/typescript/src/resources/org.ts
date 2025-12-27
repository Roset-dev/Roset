import { HttpClient } from "../http.js";
import { RosetClientConfig, Tenant, Member, Invitation, ApiKey } from "../types.js";

/**
 * Organization/Tenant Resource
 * Manage workspace settings, members, and API keys
 */
export class OrgResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Get current tenant details
   */
  async getTenant(): Promise<Tenant> {
    const { tenant } = await this.http.get<{ tenant: Tenant }>("/v1/org");
    return tenant;
  }

  /**
   * List workspace members
   */
  async listMembers(): Promise<Member[]> {
    const { members } = await this.http.get<{ members: Member[] }>("/v1/org/members");
    return members;
  }

  /**
   * Invite a new member
   */
  async inviteMember(params: { email: string; role: string }): Promise<Invitation> {
    const { invitation } = await this.http.post<{ invitation: Invitation }>(
      "/v1/org/invites",
      params
    );
    return invitation;
  }

  /**
   * List API keys
   */
  async listApiKeys(): Promise<ApiKey[]> {
    const { keys } = await this.http.get<{ keys: ApiKey[] }>("/v1/org/api-keys");
    return keys;
  }

  /**
   * Create a new API key
   */
  async createApiKey(params: { name: string; scopes: string[] }): Promise<ApiKey & { key: string }> {
    const { apiKey, key } = await this.http.post<{ apiKey: ApiKey; key: string }>(
      "/v1/org/api-keys",
      params
    );
    // Return the full object including the secret key (only shown once)
    return { ...apiKey, key };
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(id: string): Promise<void> {
    await this.http.delete(`/v1/org/api-keys/${id}`);
  }
}
