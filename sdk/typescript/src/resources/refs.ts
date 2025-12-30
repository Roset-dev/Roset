import { HttpClient } from "../http.js";
import { RosetClientConfig, Ref } from "../types.js";

/**
 * Refs Resource
 * Symbolic references (tags/aliases) for nodes
 */
export class RefsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Get a reference by name (e.g., 'latest', 'staging')
   */
  async get(name: string): Promise<Ref> {
    const { ref } = await this.http.get<{ ref: Ref }>(`/v1/refs/${name}`);
    return ref;
  }

  /**
   * Update or create a reference to point to a target commit
   */
  async update(name: string, commitId: string): Promise<Ref> {
    const { ref } = await this.http.put<{ ref: Ref }>(
      `/v1/refs/${name}`,
      { commit_id: commitId }
    );
    return ref;
  }

  /**
   * Delete a reference
   */
  async delete(name: string): Promise<void> {
    await this.http.delete(`/v1/refs/${name}`);
  }
}
