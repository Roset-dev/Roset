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
   * @returns The updated job record with re-queued status.
   * @throws {NotFoundError} If the job does not exist.
   * @throws {ConflictError} If the job is not in a failed state.
   */
  async retry(id: string): Promise<JobRecord> {
    return this.http.post<JobRecord>(`/v1/jobs/${id}/retry`);
  }
}
