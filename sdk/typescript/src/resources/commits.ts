import { HttpClient } from "../http.js";
import { RosetClientConfig, Commit, CommitOptions, PaginatedResult, CompareResult } from "../types.js";

/**
 * Commits Resource
 * Checkpoints and version control for ML workflows
 */
export class CommitsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Create a checkpoint (commit) for a folder
   */
  async create(nodeId: string, options?: CommitOptions): Promise<Commit> {
    const { commit } = await this.http.post<{ commit: Commit }>(
      "/v1/commits", 
      { 
        node_id: nodeId, 
        message: options?.message,
        metadata: options?.metadata 
      }
    );
    return commit;
  }

  /**
   * Get a commit by ID
   */
  async get(commitId: string): Promise<Commit> {
    const { commit } = await this.http.get<{ commit: Commit }>(`/v1/commits/${commitId}`);
    return commit;
  }

  /**
   * List commits for a specific folder
   */
  async list(nodeId: string, page = 1, pageSize = 50): Promise<PaginatedResult<Commit>> {
    const query = new URLSearchParams({
      node_id: nodeId,
      page: page.toString(),
      page_size: pageSize.toString()
    });
    return this.http.get<PaginatedResult<Commit>>(`/v1/commits?${query.toString()}`);
  }

  /**
   * Compare two checkpoints
   * 
   * @param targetId - The newer commit ID
   * @param baseId - The older/baseline commit ID
   */
  async compare(targetId: string, baseId: string): Promise<CompareResult> {
    const query = new URLSearchParams({ base_id: baseId });
    return this.http.get<CompareResult>(`/v1/commits/${targetId}/compare?${query.toString()}`);
  }
}
