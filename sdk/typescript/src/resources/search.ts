import { HttpClient } from "../http.js";
import { 
  RosetClientConfig, 
  SearchFilters, 
  SearchResult, 
  QuickSearch,
  PaginatedResult, 
  RequestOptions 
} from "../types.js";

/**
 * Search Resource
 * Query files, folders, and metadata
 */
export class SearchResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Search for files or folders
   * 
   * @example
   * ```typescript
   * // Basic search
   * const { items } = await client.search.query('report');
   * 
   * // Advanced search with filters
   * const { items } = await client.search.query('report', {
   *   type: 'file',
   *   minSize: 1024,
   *   mode: 'fulltext'
   * });
   * ```
   */
  async query(
    query: string,
    filters?: SearchFilters,
    page = 1,
    pageSize = 50,
    options?: RequestOptions
  ): Promise<PaginatedResult<SearchResult>> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...this.serializeFilters(filters)
    });
    
    return this.http.get<PaginatedResult<SearchResult>>(
      `/v1/search?${params.toString()}`,
      options
    );
  }

  /**
   * Quick search (autocomplete)
   * 
   * @example
   * ```typescript
   * const { items } = await client.search.quick('repo');
   * ```
   */
  async quick(
    query: string,
    limit = 10,
    options?: RequestOptions
  ): Promise<{ items: QuickSearch[] }> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    return this.http.get<{ items: QuickSearch[] }>(
      `/v1/search/quick?${params.toString()}`,
      options
    );
  }

  private serializeFilters(filters?: SearchFilters): Record<string, string> {
    if (!filters) return {};
    
    const result: Record<string, string> = {};
    if (filters.mode) result.mode = filters.mode;
    if (filters.type) result.type = filters.type;
    if (filters.folderId) result.folderId = filters.folderId;
    if (filters.contentType) result.contentType = filters.contentType;
    if (filters.minSize) result.minSize = filters.minSize.toString();
    if (filters.maxSize) result.maxSize = filters.maxSize.toString();
    
    if (filters.startDate) {
      result.startDate = filters.startDate instanceof Date
        ? filters.startDate.toISOString()
        : filters.startDate;
    }
    
    if (filters.endDate) {
      result.endDate = filters.endDate instanceof Date
        ? filters.endDate.toISOString()
        : filters.endDate;
    }
    
    return result;
  }
}
