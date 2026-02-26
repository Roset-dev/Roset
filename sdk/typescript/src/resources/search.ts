/**
 * Search resource for querying files via full-text, vector, or hybrid search.
 *
 * @example
 * ```typescript
 * const results = await client.search.query({ query: "payment terms" });
 * ```
 *
 * @module resources/search
 */

import type { HttpClient } from "../client.js";

/** A single search result entry. */
export interface SearchResultItem {
  /** The ID of the matched file. */
  fileId: string;
  /** Relevance score (higher is better). */
  score: number;
  /** Text snippet with highlighted matches (text/hybrid mode). */
  snippet?: string;
  /** Matched chunk text (vector/hybrid mode). */
  chunkText?: string;
  /** Index of the matched chunk within the file's embeddings. */
  chunkIndex?: number;
}

/** Response from the search endpoint. */
export interface SearchResponse {
  /** Array of matching files ordered by relevance. */
  results: SearchResultItem[];
  /** Total number of matches (may exceed results.length when paginated). */
  total: number;
  /** The query that was searched. */
  query: string;
  /** The search mode that was used. */
  mode: string;
}

/** Parameters for a search query. */
export interface SearchParams {
  /** The search query string. */
  query: string;
  /** Search mode: "text" (FTS), "vector" (semantic), or "hybrid" (default). */
  mode?: "text" | "vector" | "hybrid";
  /** Optional space to scope the search to. */
  space?: string;
  /** Maximum number of results (default 20, max 100). */
  limit?: number;
  /** Offset for pagination (text mode only). */
  offset?: number;
}

/**
 * Search files using full-text, vector similarity, or hybrid search.
 */
export class SearchResource {
  constructor(private http: HttpClient) {}

  /**
   * Search for files matching a query.
   *
   * @param params - Search parameters including query string and optional mode/filters.
   * @returns Search results ordered by relevance.
   *
   * @example
   * ```typescript
   * // Full-text search
   * const { results } = await client.search.query({
   *   query: "payment terms",
   *   mode: "text",
   * });
   *
   * // Hybrid search (default)
   * const { results } = await client.search.query({
   *   query: "financial obligations",
   *   space: "contracts",
   * });
   * ```
   */
  async query(params: SearchParams): Promise<SearchResponse> {
    return this.http.post<SearchResponse>("/v1/search", {
      query: params.query,
      mode: params.mode,
      space: params.space,
      limit: params.limit,
      offset: params.offset,
    });
  }
}
