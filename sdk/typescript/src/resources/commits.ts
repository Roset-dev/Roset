import { HttpClient } from "../http.js";
import { RosetClientConfig, Commit, CommitOptions, PaginatedResult, CompareResult, RequestOptions } from "../types.js";
import { PaginatedIterator } from "../pagination.js";

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
      `/v1/nodes/${nodeId}/commit`, 
      { 
        message: options?.message,
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
   * 
   * @param nodeId - The folder node ID
   * @param options - Pagination and filtering options
   */
  async list(
    nodeId: string, 
    options?: { 
      page?: number; 
      pageSize?: number;
      status?: 'pending' | 'completed' | 'failed';
    }
  ): Promise<PaginatedResult<Commit>> {
    const query = new URLSearchParams();
    if (nodeId) query.set('nodeId', nodeId);
    if (options?.page) query.set('page', options.page.toString());
    if (options?.pageSize) query.set('pageSize', options.pageSize.toString());
    if (options?.status) query.set('status', options.status);
    
    return this.http.get<PaginatedResult<Commit>>(`/v1/commits?${query.toString()}`);
  }

  /**
   * List all commits for a specific folder (auto-paginated)
   */
  listAll(
    nodeId: string, 
    options?: { 
      pageSize?: number;
      status?: 'pending' | 'completed' | 'failed';
    } & RequestOptions
  ): PaginatedIterator<Commit> {
    return new PaginatedIterator((opts) => 
      this.list(nodeId, { ...options, ...opts })
    );
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
