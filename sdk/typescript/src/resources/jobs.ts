/**
 * Jobs resource -- inspect, cancel, and retry file processing jobs.
 *
 * Every file upload creates a processing job that tracks the extraction
 * pipeline's progress through a state machine:
 * `uploading -> queued -> processing -> completed | failed`.
 *
 * Jobs are routed to extraction providers based on content type:
 * - Documents (PDF, DOCX, PPTX) -> Reducto
 * - Images (PNG, JPG, WebP) -> Gemini
 * - Audio (MP3, WAV, M4A) -> Whisper
 * - Embeddings -> OpenAI
 *
 * Failed jobs can be retried, and in-progress jobs can be cancelled.
 *
 * @module resources/jobs
 */

import type { HttpClient } from "../client.js";

/**
 * A processing job record.
 *
 * Represents a single extraction pipeline execution for one file. Tracks
 * status, the selected provider, timing information, retry count, and any
 * error details if the job failed.
 */
export interface JobRecord {
  /** Unique job identifier (UUID). */
  id: string;

  /** ID of the file being processed. */
  file_id: string;

  /** Space namespace of the associated file. */
  space: string;

  /** Job status: `"uploading"`, `"queued"`, `"processing"`, `"completed"`, or `"failed"`. */
  status: string;

  /** Extraction provider handling this job (e.g. `"reducto"`, `"gemini"`, `"whisper"`), or null if not yet assigned. */
  provider: string | null;

  /** JSON-encoded processing configuration. */
  config: string;

  /** Human-readable error message if the job failed, or null. */
  error: string | null;

  /** Machine-readable error code if the job failed, or null. */
  error_code: string | null;

  /** Number of retry attempts made for this job. */
  retries: number;

  /** Total processing time in milliseconds, or null if not yet completed. */
  processing_duration_ms: number | null;

  /** ISO 8601 timestamp of when the job was created. */
  created_at: string;

  /** ISO 8601 timestamp of when processing started, or null if still queued. */
  started_at: string | null;

  /** ISO 8601 timestamp of when processing finished, or null if still running. */
  completed_at: string | null;

  /** Current pipeline step: `"extracting"`, `"variants"`, `"embedding"`, `"completed"`, or null if not yet started. */
  current_step: string | null;

  /** Variant types requested for this job (e.g. `["markdown", "embeddings"]`), or null. */
  variants_requested: string[] | null;

  /** Variant types completed so far (e.g. `["markdown", "metadata"]`), or null. */
  variants_completed: string[] | null;

  /** Variant types with stored output, derived from the variants table. Present on GET /v1/jobs/:id. */
  variants_ready?: string[];
}

/**
 * Paginated response from {@link JobsResource.list}.
 */
export interface ListJobsResponse {
  /** Array of job records matching the query. */
  jobs: JobRecord[];

  /** Cursor for fetching the next page, or `null` if this is the last page. */
  next_cursor: string | null;
}

/**
 * Resource for inspecting and managing file processing jobs.
 *
 * Provides methods to list jobs with filtering, retrieve individual job
 * details, cancel in-progress jobs, and retry failed jobs.
 */
export class JobsResource {
  constructor(private http: HttpClient) {}

  /**
   * List processing jobs with optional filtering and cursor-based pagination.
   *
   * @param params - Optional filter and pagination parameters.
   * @param params.space - Optional namespace to filter by. Defaults to `"default"` if omitted.
   * @param params.status - Filter by job status (e.g. `"processing"`, `"failed"`, `"completed"`).
   * @param params.limit - Maximum number of jobs to return per page.
   * @param params.cursor - Pagination cursor from a previous `ListJobsResponse.next_cursor`.
   * @returns Paginated list of job records.
   */
  async list(params?: {
    space?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ListJobsResponse> {
    const query: Record<string, string> = {};
    if (params?.space) query.space = params.space;
    if (params?.status) query.status = params.status;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;
    return this.http.get<ListJobsResponse>("/v1/jobs", query);
  }

  /**
   * Retrieve a single job by ID.
   *
   * @param id - The job's unique identifier (UUID).
   * @returns The full job record including status, timing, and error details.
   * @throws {NotFoundError} If the job does not exist.
   */
  async get(id: string): Promise<JobRecord> {
    return this.http.get<JobRecord>(`/v1/jobs/${id}`);
  }

  /**
   * Cancel an in-progress or queued processing job.
   *
   * Only jobs in `"queued"` or `"processing"` status can be cancelled. Already
   * completed or failed jobs cannot be cancelled.
   *
   * @param id - The job's unique identifier (UUID).
   * @returns The updated job record with cancelled status.
   * @throws {NotFoundError} If the job does not exist.
   * @throws {ConflictError} If the job is already completed or failed.
   */
  async cancel(id: string): Promise<JobRecord> {
    return this.http.post<JobRecord>(`/v1/jobs/${id}/cancel`);
  }

  /**
   * Retry a failed processing job.
   *
   * Creates a new processing attempt for a job that previously failed. The job
   * re-enters the queue and is routed to the appropriate extraction provider.
   *
   * @param id - The job's unique identifier (UUID).
   * @param options - Optional retry parameters.
   * @param options.skipExistingVariants - When true, skip variant types that already have stored output.
   * @returns The updated job record with re-queued status.
   * @throws {NotFoundError} If the job does not exist.
   * @throws {ConflictError} If the job is not in a failed state.
   */
  async retry(id: string, options?: { skipExistingVariants?: boolean }): Promise<JobRecord> {
    return this.http.post<JobRecord>(`/v1/jobs/${id}/retry`, options || {});
  }

  /**
   * Poll a job until the specified variant types are ready.
   *
   * Returns as soon as all requested variants appear in `variants_ready`,
   * without waiting for the full pipeline to finish. Useful for reacting to
   * the earliest usable output (e.g. markdown) while embeddings are still
   * generating.
   *
   * @param id - The job's unique identifier (UUID).
   * @param variants - Variant types to wait for (e.g. `["markdown"]`).
   * @param options - Polling options.
   * @param options.intervalMs - Polling interval in milliseconds. Defaults to 2000.
   * @param options.timeoutMs - Maximum wait time in milliseconds. Defaults to 600000 (10 min).
   * @returns The job record once all requested variants are ready.
   * @throws {Error} If timeout is reached before all variants are ready.
   */
  async waitForVariants(
    id: string,
    variants: string[],
    options?: { intervalMs?: number; timeoutMs?: number },
  ): Promise<JobRecord> {
    const interval = options?.intervalMs ?? 2000;
    const timeout = options?.timeoutMs ?? 600_000;
    const deadline = Date.now() + timeout;
    const wanted = new Set(variants);

    while (Date.now() < deadline) {
      const job = await this.get(id);

      // Check if all wanted variants are ready
      const ready = new Set(job.variants_ready || []);
      const allReady = [...wanted].every(v => ready.has(v));
      if (allReady) return job;

      // Terminal failure — no point polling further
      if (job.status === "failed") {
        throw new Error(`Job ${id} failed before variants were ready: ${job.error || "unknown error"}`);
      }

      await new Promise(r => setTimeout(r, interval));
    }

    throw new Error(`Timed out waiting for variants [${variants.join(", ")}] on job ${id}`);
  }
}
