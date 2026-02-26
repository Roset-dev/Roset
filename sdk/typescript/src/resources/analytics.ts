/**
 * Analytics resource -- query file processing metrics and statistics.
 *
 * Provides read-only endpoints for understanding processing activity across
 * the organization: file volumes, processing success/failure rates, provider
 * utilization, storage growth, and per-space breakdowns. Useful for building
 * dashboards, monitoring pipelines, and identifying processing bottlenecks.
 *
 * All analytics endpoints return aggregate data and do not expose individual
 * file contents.
 *
 * @module resources/analytics
 */

import type { HttpClient } from "../client.js";

/**
 * Resource for querying file processing analytics and metrics.
 *
 * All methods return aggregate statistics as untyped records since the API
 * response shapes may evolve. Use these endpoints to build monitoring
 * dashboards, track processing health, and identify trends.
 */
export class AnalyticsResource {
  constructor(private http: HttpClient) {}

  /**
   * Get a high-level overview of the organization's processing activity.
   *
   * Returns aggregate counts including total files, active jobs, completed
   * jobs, failed jobs, total storage used, and variant counts.
   *
   * @returns Overview statistics object.
   */
  async overview(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/v1/analytics/overview");
  }

  /**
   * Get processing pipeline statistics over a time window.
   *
   * Returns metrics like average processing time, success rate, throughput,
   * and queue depth over the specified number of days.
   *
   * @param days - Number of days to look back. Defaults to server-side default (typically 30).
   * @returns Processing statistics object.
   */
  async processing(days?: number): Promise<Record<string, unknown>> {
    const query: Record<string, string> = {};
    if (days) query.days = String(days);
    return this.http.get<Record<string, unknown>>("/v1/analytics/processing", query);
  }

  /**
   * Get a breakdown of files by content type.
   *
   * Returns counts and sizes grouped by MIME type (e.g. `application/pdf`,
   * `image/png`, `audio/mp3`).
   *
   * @returns File type distribution object.
   */
  async fileTypes(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/v1/analytics/file-types");
  }

  /**
   * Get per-space analytics.
   *
   * Returns file counts, processing statistics, and storage usage broken
   * down by space namespace. Useful for multi-tenant B2B SaaS monitoring.
   *
   * @returns Per-space analytics object.
   */
  async spaces(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/v1/analytics/spaces");
  }

  /**
   * Get recent processing failures.
   *
   * Returns a list of recently failed jobs with error details, useful for
   * debugging and alerting on pipeline issues.
   *
   * @param limit - Maximum number of failure records to return.
   * @returns Failure records object.
   */
  async failures(limit?: number): Promise<Record<string, unknown>> {
    const query: Record<string, string> = {};
    if (limit) query.limit = String(limit);
    return this.http.get<Record<string, unknown>>("/v1/analytics/failures", query);
  }

  /**
   * Get file upload volume over a time window.
   *
   * Returns daily upload counts and total bytes ingested, useful for
   * capacity planning and usage monitoring.
   *
   * @param days - Number of days to look back. Defaults to server-side default.
   * @returns Volume statistics object.
   */
  async volume(days?: number): Promise<Record<string, unknown>> {
    const query: Record<string, string> = {};
    if (days) query.days = String(days);
    return this.http.get<Record<string, unknown>>("/v1/analytics/volume", query);
  }

  /**
   * Get processing trend data over a time window.
   *
   * Returns time-series data points for uploads, completions, and failures,
   * suitable for charting.
   *
   * @param days - Number of days to look back. Defaults to server-side default.
   * @returns Trends time-series object.
   */
  async trends(days?: number): Promise<Record<string, unknown>> {
    const query: Record<string, string> = {};
    if (days) query.days = String(days);
    return this.http.get<Record<string, unknown>>("/v1/analytics/trends", query);
  }

  /**
   * Get extraction provider utilization statistics.
   *
   * Returns per-provider metrics including job counts, success rates, and
   * average processing times for Reducto, Gemini, Whisper, and OpenAI.
   *
   * @param days - Number of days to look back. Defaults to server-side default.
   * @returns Provider utilization statistics object.
   */
  async providers(days?: number): Promise<Record<string, unknown>> {
    const query: Record<string, string> = {};
    if (days) query.days = String(days);
    return this.http.get<Record<string, unknown>>("/v1/analytics/providers", query);
  }

  /**
   * Get the most common processing failure reasons.
   *
   * Returns failure error codes ranked by frequency, useful for identifying
   * systemic issues (e.g. provider outages, invalid file formats).
   *
   * @param limit - Maximum number of failure categories to return.
   * @returns Top failures ranked by frequency.
   */
  async topFailures(limit?: number): Promise<Record<string, unknown>> {
    const query: Record<string, string> = {};
    if (limit) query.limit = String(limit);
    return this.http.get<Record<string, unknown>>("/v1/analytics/top-failures", query);
  }

  /**
   * Get storage growth metrics over a time window.
   *
   * Returns daily cumulative storage usage in bytes, useful for forecasting
   * storage costs and planning capacity.
   *
   * @param days - Number of days to look back. Defaults to server-side default.
   * @returns Storage growth time-series object.
   */
  async storageGrowth(days?: number): Promise<Record<string, unknown>> {
    const query: Record<string, string> = {};
    if (days) query.days = String(days);
    return this.http.get<Record<string, unknown>>("/v1/analytics/storage-growth", query);
  }
}
