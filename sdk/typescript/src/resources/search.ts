import { HttpClient } from "../http.js";
import { RosetClientConfig, SearchFilters, SearchResult, PaginatedResult } from "../types.js";

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
   */
  async query(
    query: string,
    filters?: SearchFilters,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResult<SearchResult>> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      page_size: pageSize.toString(),
      ...this.serializeFilters(filters)
    });
    return this.http.get<PaginatedResult<SearchResult>>(`/v1/search?${params.toString()}`);
  }

  private serializeFilters(filters?: SearchFilters): Record<string, string> {
    if (!filters) return {};
    
    const result: Record<string, string> = {};
    if (filters.type) result.type = filters.type;
    if (filters.parentId) result.parent_id = filters.parentId;
    if (filters.extensions) result.extensions = filters.extensions.join(',');
    if (filters.minSize) result.min_size = filters.minSize.toString();
    if (filters.maxSize) result.max_size = filters.maxSize.toString();
    if (filters.dateRange?.start) result.start_date = filters.dateRange.start.toString();
    if (filters.dateRange?.end) result.end_date = filters.dateRange.end.toString();
    
    return result;
  }
}
