/**
 * @roset/sdk -- TypeScript SDK for the Roset file processing orchestration API.
 *
 * Roset is the transformation engine for unstructured data. Upload any document
 * and get back structured outputs: markdown, embeddings, metadata, thumbnails,
 * and a searchable index. Roset orchestrates extraction providers (Reducto,
 * Gemini, Whisper, OpenAI), managing queues, retries, variant tracking, and
 * space isolation. File bytes go directly to storage via signed URLs.
 *
 * This module is the main entry point for the SDK. It re-exports the client,
 * all resource classes, type interfaces, and error hierarchy so consumers can
 * import everything from a single package.
 *
 * @example
 * ```typescript
 * import { RosetClient } from '@roset/sdk';
 *
 * const client = new RosetClient({ apiKey: 'rsk_...' });
 *
 * // Upload a file -- returns a signed URL for direct upload and a processing job ID
 * const { file_id, upload_url } = await client.files.upload({
 *   filename: 'report.pdf',
 *   content_type: 'application/pdf',
 *   size_bytes: 1024,
 * });
 *
 * // List files scoped to a space
 * const { files } = await client.files.list({ space: 'acme' });
 *
 * // Check processing analytics
 * const overview = await client.analytics.overview();
 * ```
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export { RosetClient, HttpClient } from "./client.js";
export type { RosetClientConfig } from "./client.js";

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

/** File upload, listing, deletion, and variant retrieval. */
export { FilesResource } from "./resources/files.js";
export type { FileRecord, VariantRecord, UploadResponse, ListFilesResponse, ProgressEvent } from "./resources/files.js";

/** Processing job inspection, cancellation, and retry. */
export { JobsResource } from "./resources/jobs.js";
export type { JobRecord, ListJobsResponse } from "./resources/jobs.js";

/** Storage provider connection management (S3, GCS, Azure Blob Storage, Cloudflare R2, MinIO, Supabase Storage, Backblaze B2, DigitalOcean Spaces, Wasabi). */
export { ConnectionsResource } from "./resources/connections.js";
export type { ConnectionRecord } from "./resources/connections.js";

/** File/folder tree operations on connected storage. */
export { NodesResource } from "./resources/nodes.js";
export type { NodeRecord, ListNodesResponse } from "./resources/nodes.js";

/** Webhook subscription management for processing lifecycle events. */
export { WebhooksResource, WebhookVerificationError, verifyWebhookSignature } from "./resources/webhooks.js";
export type {
  WebhookRecord,
  WebhookDeliveryRecord,
  WebhookEvent,
  WebhookPayload,
  FileCreatedEvent,
  FileProcessingStartedEvent,
  FileProcessingCompletedEvent,
  FileProcessingFailedEvent,
  FileVariantReadyEvent,
  FileDeletedEvent,
  JobCompletedEvent,
  JobFailedEvent,
  BatchCompletedEvent,
  ConnectionSyncedEvent,
  WebhookTestEvent,
} from "./resources/webhooks.js";

/** Optional namespace management for B2B SaaS isolation. */
export { SpacesResource } from "./resources/spaces.js";
export type { SpaceRecord } from "./resources/spaces.js";

/** API key creation, listing, and revocation. */
export { ApiKeysResource } from "./resources/api-keys.js";
export type { ApiKeyRecord, CreateApiKeyResponse } from "./resources/api-keys.js";

/** BYOK (Bring Your Own Key) extraction provider key management. */
export { ProviderKeysResource } from "./resources/provider-keys.js";
export type { ProviderKeyRecord } from "./resources/provider-keys.js";

/** File processing analytics and metrics. */
export { AnalyticsResource } from "./resources/analytics.js";

/** Full-text, vector, and hybrid file search. */
export { SearchResource } from "./resources/search.js";
export type { SearchResultItem, SearchResponse, SearchParams } from "./resources/search.js";

/** RAG-powered Q&A over your files. */
export { QAResource } from "./resources/qa.js";
export type { QASource, QAResponse, QAParams } from "./resources/qa.js";

// ---------------------------------------------------------------------------
// Typed variant objects (discriminated unions)
// ---------------------------------------------------------------------------

export type {
  LanguageInfo,
  MarkdownVariant,
  EmbeddingChunk,
  EmbeddingsVariant,
  MetadataVariant,
  ThumbnailVariant,
  SearchableIndexVariant,
  TypedVariant,
  VariantType,
} from "./types/variants.js";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Error hierarchy for Roset API responses. Each error class corresponds to a
 * specific HTTP status code range and includes structured metadata (code,
 * requestId, retryable flag) to support programmatic error handling.
 */
export {
  RosetError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  RateLimitError,
  QuotaExceededError,
  UnauthorizedError,
  TimeoutError,
  ServiceUnavailableError,
  ServerError,
  NetworkError,
  parseApiError,
} from "./errors.js";
