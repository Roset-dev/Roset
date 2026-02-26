/**
 * Files resource -- upload, list, retrieve, delete files and fetch their variants.
 *
 * Files are the core entity in Roset. When you upload a file, Roset registers
 * it, issues a signed URL for direct upload to the storage provider, and
 * creates a processing job that routes the file to the appropriate
 * extraction provider (Reducto for documents, Gemini for images, Whisper for
 * audio). After processing completes, variants (markdown, embeddings,
 * metadata) become available on the file.
 *
 * Roset never proxies file bytes -- the SDK receives a signed upload URL and
 * your application uploads directly to the storage bucket.
 *
 * @module resources/files
 */

import type { HttpClient } from "../client.js";
import type { JobRecord } from "./jobs.js";
import { RosetError } from "../errors.js";

/**
 * Progress event emitted during file upload and processing.
 *
 * The SDK polls `GET /v1/jobs/:id` at 2-second intervals after upload and
 * maps job state transitions to progress events.
 */
export interface ProgressEvent {
  /** Current processing stage. */
  stage: 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
  /** Variant type being generated, if applicable. */
  variant?: string;
  /** Current pipeline step (e.g. `"extracting"`, `"variants"`, `"embedding"`). */
  current_step?: string;
  /** Variant types completed so far. */
  variants_completed?: string[];
  /** ISO 8601 timestamp of this event. */
  timestamp: string;
}

/**
 * A file record tracked by Roset.
 *
 * Represents a single uploaded document, image, audio file, or other asset.
 * Each file belongs to a space namespace and progresses through the processing
 * state machine (`uploading -> queued -> processing -> completed | failed`).
 */
export interface FileRecord {
  /** Unique file identifier (UUID). */
  id: string;

  /** Space namespace this file belongs to. Defaults to `"default"`. */
  space: string;

  /** Original filename including extension (e.g. `"report.pdf"`). */
  filename: string;

  /** MIME type of the file (e.g. `"application/pdf"`), or null if unknown. */
  content_type: string | null;

  /** File size in bytes. */
  size_bytes: number;

  /** Storage key (object path) in the connected bucket. */
  storage_key: string;

  /** Processing status: `"uploading"`, `"queued"`, `"processing"`, `"completed"`, or `"failed"`. */
  status: string;

  /** JSON-encoded user-supplied metadata attached at upload time. */
  metadata: string;

  /** ISO 8601 timestamp of when the file was created. */
  created_at: string;

  /** ISO 8601 timestamp of the last update. */
  updated_at: string;

  /** Processing variants (markdown, embeddings, metadata) if requested via include. */
  variants?: VariantRecord[];
}

/**
 * A variant is a processed output derived from a parent file.
 *
 * Variants are created by extraction providers during processing. Common types
 * include `"markdown"` (extracted text), `"embedding"` (vector representation),
 * and `"metadata"` (structured extraction output).
 */
export interface VariantRecord {
  /** Unique variant identifier (UUID). */
  id: string;

  /** ID of the parent file this variant was derived from. */
  file_id: string;

  /** Variant type: `"markdown"`, `"embedding"`, or `"metadata"`. */
  type: string;

  /** Extraction provider that produced this variant (e.g. `"reducto"`, `"openai"`), or null. */
  provider: string | null;

  /** MIME type of the variant content, or null. */
  content_type: string | null;

  /** Variant content size in bytes. */
  size_bytes: number;

  /** ISO 8601 timestamp of when the variant was created. */
  created_at: string;
}

/**
 * Parsed content of a metadata variant.
 *
 * Access via `JSON.parse(variant.content)` when `variant.type === "metadata"`.
 */
export interface MetadataVariantContent {
  common: {
    filename: string;
    content_type: string;
    size_bytes: number;
    word_count: number;
    char_count: number;
    language?: string;
    page_count?: number;
    duration_seconds?: number;
    has_ocr_text?: boolean;
    labels?: string[];
  };
  provider_raw: Record<string, unknown>;

  /**
   * Heuristic confidence score (0.0–1.0) for the extraction quality.
   * Higher values indicate cleaner extraction. Below 0.7 suggests potential issues.
   */
  extraction_confidence?: number;

  /**
   * Quality warnings detected in the extracted content.
   * Possible values: `"mixed_rtl_ltr"`, `"sparse_text_for_page_count"`,
   * `"table_structure_low_confidence"`, `"unicode_replacement_chars"`,
   * `"possible_garbled_text"`.
   */
  quality_warnings?: string[];
}

/**
 * Response returned by {@link FilesResource.upload}.
 *
 * Contains the newly created file ID, a processing job ID, and a signed
 * `upload_url` for direct upload to the storage provider. After uploading bytes
 * to `upload_url`, the processing job will begin automatically.
 */
export interface UploadResponse {
  /** Unique identifier for the newly created file. */
  file_id: string;

  /** Unique identifier for the processing job created for this file. */
  job_id: string;

  /** Original filename. */
  filename: string;

  /** Space namespace this file belongs to. */
  space: string;

  /** MIME content type. */
  content_type: string;

  /** File size in bytes. */
  size_bytes: number;

  /** Initial processing status (typically `"uploading"`). */
  status: string;

  /** Whether this upload was initiated in test mode. */
  test_mode: boolean;

  /**
   * Signed URL for direct file upload. PUT your file bytes to this URL.
   * Roset never proxies file bytes -- uploads go directly to the storage bucket.
   */
  upload_url: string;
}

/**
 * Paginated response from {@link FilesResource.list}.
 */
export interface ListFilesResponse {
  /** Array of file records matching the query. */
  files: FileRecord[];

  /** Cursor for fetching the next page, or `null` if this is the last page. */
  next_cursor: string | null;
}

/**
 * Resource for managing files in Roset.
 *
 * Provides methods to upload new files (receiving a signed URL for direct
 * upload), list files with pagination and filtering, retrieve individual file
 * details, delete files, and fetch processing variants.
 */
export class FilesResource {
  constructor(private http: HttpClient) {}

  /**
   * Initiate a file upload.
   *
   * Registers the file with Roset, creates a processing job, and
   * returns a signed URL for direct upload to the storage provider. After you
   * PUT file bytes to `upload_url`, processing begins automatically.
   *
   * @param params - Upload parameters.
   * @param params.filename - Original filename with extension (e.g. `"report.pdf"`).
   * @param params.content_type - MIME type (e.g. `"application/pdf"`, `"image/png"`).
   * @param params.size_bytes - File size in bytes.
   * @param params.space - Optional namespace for multi-tenant apps. Defaults to `"default"`.
   * @param params.metadata - Optional key-value metadata to attach to the file.
   * @returns Upload response including `file_id`, `job_id`, and `upload_url`.
   * @throws {ValidationError} If required fields are missing or invalid.
   * @throws {QuotaExceededError} If the organization's file quota is exceeded.
   */
  async upload(params: {
    filename: string;
    content_type: string;
    size_bytes: number;
    space?: string;
    metadata?: Record<string, unknown>;
    /** Override the extraction provider (e.g. `"reducto"`, `"gemini"`, `"whisper"`). Bypasses automatic routing. */
    provider?: 'reducto' | 'llamaparse' | 'gemini' | 'whisper' | 'openai';
    /** Override the embedding model (e.g. `"text-embedding-3-large"`). */
    embedding_model?: string;
    /** Chunking configuration for embeddings generation. */
    chunking?: { chunk_size?: number; chunk_overlap?: number; strategy?: 'recursive' | 'paragraph' | 'sentence' };
    /** Subset of variant types to generate. Defaults to all 4. */
    variants?: Array<'markdown' | 'embeddings' | 'metadata' | 'searchable-index'>;
    /** Skip processing — create file record without triggering extraction. */
    skip_processing?: boolean;
    /**
     * Progress callback. When provided, the SDK polls `GET /v1/jobs/:id`
     * at 2-second intervals after upload and calls this function on each
     * state transition until a terminal state is reached.
     */
    onProgress?: (event: ProgressEvent) => void;
  }): Promise<UploadResponse> {
    const { onProgress, ...uploadParams } = params;
    if (!uploadParams.space) uploadParams.space = "default";
    const result = await this.http.post<UploadResponse>("/v1/upload", uploadParams);

    if (onProgress && result.job_id) {
      onProgress({ stage: 'uploading', timestamp: new Date().toISOString() });
      await this.pollJobProgress(result.job_id, onProgress);
    }

    return result;
  }

  /**
   * Poll a job until it reaches a terminal state, calling onProgress on each transition.
   * @internal
   */
  private async pollJobProgress(
    jobId: string,
    onProgress: (event: ProgressEvent) => void,
  ): Promise<void> {
    let lastStage = 'uploading';
    let lastStep = '';
    let lastCompletedCount = 0;
    const POLL_INTERVAL_MS = 2000;
    const MAX_POLLS = 300; // 10 minutes max

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      let job: JobRecord;
      try {
        job = await this.http.get<JobRecord>(`/v1/jobs/${jobId}`);
      } catch (err) {
        // Only retry on retryable errors (network, 429, 5xx)
        if (err instanceof RosetError && err.retryable) {
          continue;
        }
        // Non-retryable error (401, 403, 404, 400) — stop polling
        onProgress({ stage: 'failed', timestamp: new Date().toISOString() });
        return;
      }

      const stage = job.status as ProgressEvent['stage'];
      const step = job.current_step || '';
      const completedCount = (job.variants_completed || []).length;

      // Emit on stage change, step change, or new variant completion
      if (stage !== lastStage || step !== lastStep || completedCount !== lastCompletedCount) {
        onProgress({
          stage,
          current_step: job.current_step || undefined,
          variants_completed: job.variants_completed || undefined,
          timestamp: new Date().toISOString(),
        });
        lastStage = stage;
        lastStep = step;
        lastCompletedCount = completedCount;
      }

      if (stage === 'completed' || stage === 'failed') {
        break;
      }
    }
  }

  /**
   * List files with optional filtering and cursor-based pagination.
   *
   * @param params - Optional filter and pagination parameters.
   * @param params.space - Optional namespace to filter by. Defaults to `"default"` if omitted.
   * @param params.status - Filter by processing status (e.g. `"completed"`, `"failed"`).
   * @param params.limit - Maximum number of files to return per page.
   * @param params.cursor - Pagination cursor from a previous `ListFilesResponse.next_cursor`.
   * @returns Paginated list of file records.
   */
  async list(params?: {
    space?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ListFilesResponse> {
    const query: Record<string, string> = {};
    if (params?.space) query.space = params.space;
    if (params?.status) query.status = params.status;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;
    return this.http.get<ListFilesResponse>("/v1/files", query);
  }

  /**
   * Retrieve a single file by ID.
   *
   * @param id - The file's unique identifier (UUID).
   * @returns The full file record including status and metadata.
   * @throws {NotFoundError} If the file does not exist.
   */
  async get(id: string): Promise<FileRecord> {
    return this.http.get<FileRecord>(`/v1/files/${id}`);
  }

  /**
   * Delete a file and its associated variants and processing data.
   *
   * @param id - The file's unique identifier (UUID).
   * @throws {NotFoundError} If the file does not exist.
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/files/${id}`);
  }

  /**
   * Retrieve all processing variants for a file.
   *
   * Variants are outputs produced by extraction providers: markdown text,
   * vector embeddings, and structured metadata. They become
   * available after the file's processing job completes.
   *
   * @param id - The file's unique identifier (UUID).
   * @returns Object containing an array of variant records.
   * @throws {NotFoundError} If the file does not exist.
   */
  async getVariants(id: string): Promise<{ variants: VariantRecord[] }> {
    return this.http.get<{ variants: VariantRecord[] }>(`/v1/files/${id}/variants`);
  }

  /**
   * Trigger processing for a single file.
   *
   * Creates a new extraction job and enqueues it. Supports pipeline control
   * parameters to customize which variants are generated and how.
   *
   * @param id - The file's unique identifier (UUID).
   * @param params - Optional pipeline control parameters.
   * @returns Object with `file_id`, `job_id`, and `status`.
   * @throws {NotFoundError} If the file does not exist.
   * @throws {ConflictError} If the file is already being processed.
   */
  async process(
    id: string,
    params?: {
      /** Override the extraction provider (e.g. `"reducto"`, `"gemini"`, `"whisper"`). Bypasses automatic routing. */
      provider?: 'reducto' | 'llamaparse' | 'gemini' | 'whisper' | 'openai';
      /** Override the embedding model (e.g. `"text-embedding-3-large"`). */
      embedding_model?: string;
      /** Chunking configuration for embeddings generation. */
      chunking?: { chunk_size?: number; chunk_overlap?: number; strategy?: 'recursive' | 'paragraph' | 'sentence' };
      /** Subset of variant types to generate. Defaults to all 4. */
      variants?: Array<'markdown' | 'embeddings' | 'metadata' | 'searchable-index'>;
    },
  ): Promise<{ file_id: string; job_id: string; status: string }> {
    return this.http.post<{ file_id: string; job_id: string; status: string }>(
      `/v1/files/${id}/process`,
      params || {},
    );
  }

  /**
   * Trigger processing for multiple files in batch.
   *
   * @param params - Batch parameters: either `file_ids` or `connection_id`.
   * @returns Summary with `queued`, `skipped`, and `errors` counts.
   */
  /**
   * Get batch upload status.
   *
   * @param batchId - The batch identifier returned by `uploadBatch`.
   * @returns Batch status including per-file results.
   */
  async getBatch(batchId: string): Promise<{
    batch_id: string;
    total: number;
    completed: number;
    failed: number;
    status: string;
    results: Array<{ file_id: string; job_id: string; status: string; error: string | null }>;
  }> {
    return this.http.get(`/v1/batches/${batchId}`);
  }

  /**
   * Upload multiple files in batch with concurrency control.
   *
   * Runs parallel individual uploads (via {@link upload}) with the specified
   * concurrency limit. Returns a summary with per-file results.
   *
   * @param files - Array of upload parameters (same shape as {@link upload} params).
   * @param options - Batch options.
   * @param options.concurrency - Max parallel uploads. Defaults to 5.
   * @param options.onProgress - Called after each file completes or fails.
   * @returns Batch result with per-file outcomes.
   */
  async uploadBatch(
    files: Array<{
      filename: string;
      content_type: string;
      size_bytes: number;
      space?: string;
      metadata?: Record<string, unknown>;
      provider?: 'reducto' | 'llamaparse' | 'gemini' | 'whisper' | 'openai';
      embedding_model?: string;
      chunking?: { chunk_size?: number; chunk_overlap?: number; strategy?: 'recursive' | 'paragraph' | 'sentence' };
      variants?: Array<'markdown' | 'embeddings' | 'metadata' | 'searchable-index'>;
      skip_processing?: boolean;
    }>,
    options?: {
      concurrency?: number;
      onProgress?: (event: { index: number; total: number; result?: UploadResponse; error?: Error }) => void;
    },
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ index: number; result?: UploadResponse; error?: string }>;
  }> {
    const concurrency = options?.concurrency ?? 5;
    const results: Array<{ index: number; result?: UploadResponse; error?: string }> = [];
    let succeeded = 0;
    let failed = 0;

    // Process files with concurrency control using a simple pool
    const active = new Set<Promise<void>>();

    for (let i = 0; i < files.length; i++) {
      const index = i;
      const file = files[i];

      const p = this.upload(file)
        .then((result) => {
          succeeded++;
          results.push({ index, result });
          options?.onProgress?.({ index, total: files.length, result });
        })
        .catch((err) => {
          failed++;
          const errorMsg = err instanceof Error ? err.message : String(err);
          results.push({ index, error: errorMsg });
          options?.onProgress?.({ index, total: files.length, error: err instanceof Error ? err : new Error(errorMsg) });
        })
        .finally(() => { active.delete(p); });

      active.add(p);

      if (active.size >= concurrency) {
        await Promise.race(active);
      }
    }

    await Promise.all(active);

    results.sort((a, b) => a.index - b.index);
    return { total: files.length, succeeded, failed, results };
  }

  async processBatch(params: {
    file_ids?: string[];
    connection_id?: string;
    limit?: number;
  }): Promise<{ queued: number; skipped: number; errors: string[] }> {
    return this.http.post<{ queued: number; skipped: number; errors: string[] }>(
      "/v1/files/process-batch",
      params,
    );
  }
}
