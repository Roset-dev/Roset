import type { PaginatedResult, PaginationOptions } from "./types.js";

/**
 * Async iterator for paginated results
 */
export class PaginatedIterator<T> implements AsyncIterable<T> {
  constructor(
    private readonly fetcher: (params: PaginationOptions) => Promise<PaginatedResult<T>>,
    private readonly options: PaginationOptions = {}
  ) {}

  async *[Symbol.asyncIterator]() {
    let page = this.options.page ?? 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.fetcher({ ...this.options, page });
      
      for (const item of result.items) {
        yield item;
      }

      hasMore = result.hasMore;
      page++;
    }
  }

  /**
   * Collect all items into an array
   */
  async toArray(): Promise<T[]> {
    const items: T[] = [];
    for await (const item of this) {
      items.push(item);
    }
    return items;
  }
}
