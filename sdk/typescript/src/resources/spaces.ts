/**
 * Spaces resource -- optional namespace management.
 *
 * Spaces provide namespace isolation for B2B SaaS applications built on top
 * of Roset. Each space represents one of YOUR end-customers, scoping files
 * and processing jobs so that data from different customers never intermingles.
 *
 * **Most users do not need this.** If you are building a single-tenant
 * application, the default `"default"` space is used automatically and you
 * can ignore this resource entirely. Spaces are only relevant if you are
 * building a multi-tenant B2B SaaS product where each of your customers needs
 * isolated file processing.
 *
 * Spaces are created implicitly when a file is uploaded with a `space` param.
 * This resource lets you list existing spaces and query per-space statistics.
 *
 * @module resources/spaces
 */

import type { HttpClient } from "../client.js";

/**
 * A space namespace record with its file count.
 *
 * Spaces are lightweight namespace labels -- they are created automatically
 * on first use (when a file is uploaded with that space name) and do not
 * require explicit creation.
 */
export interface SpaceRecord {
  /** Space namespace identifier (e.g. `"default"`, `"acme-corp"`, `"customer-123"`). */
  space: string;

  /** Total number of files belonging to this space. */
  file_count: number;
}

/**
 * Resource for listing and inspecting space namespaces.
 *
 * Spaces are optional -- most single-tenant applications never interact with
 * this resource. For multi-tenant B2B SaaS apps, use this to enumerate your
 * end-customers' namespaces and query per-space statistics.
 */
export class SpacesResource {
  constructor(private http: HttpClient) {}

  /**
   * List all space namespaces in the organization.
   *
   * Returns every space that has at least one file, along with file counts.
   * The `"default"` space is always present if any files have been uploaded
   * without an explicit space name.
   *
   * @returns Object containing an array of space records.
   */
  async list(): Promise<{ spaces: SpaceRecord[] }> {
    return this.http.get<{ spaces: SpaceRecord[] }>("/v1/spaces");
  }

  /**
   * Retrieve statistics for a specific space namespace.
   *
   * Returns aggregate metrics such as file counts, storage usage, and
   * processing statistics scoped to the given space.
   *
   * @param name - The space namespace identifier (e.g. `"acme-corp"`).
   * @returns Space-scoped statistics object.
   * @throws {NotFoundError} If the space does not exist.
   */
  async getStats(name: string): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`/v1/spaces/${encodeURIComponent(name)}/stats`);
  }
}
