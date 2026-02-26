# Changelog

All notable changes to `@roset/sdk` will be documented in this file.

## [2.0.0] - 2026-02-08

### Breaking Changes
- Complete SDK rewrite for the Roset transformation engine API
- All resource methods now use the v1 API surface

### Added
- `RosetClient` — main entry point with typed configuration
- **Files** — upload, list, get, delete, listVariants, getVariant, uploadBatch, process, processBatch
- **Jobs** — list, get, cancel, retry (with optional provider override)
- **Connections** — create, list, get, delete, test, sync for S3/GCS/Azure/R2/MinIO/Supabase
- **Nodes** — list, get, download, delete, upload, move, rename, listChildren, search
- **Webhooks** — create, list, get, update, delete, test, deliveries, rotateSecret, replay
- **Spaces** — list, stats
- **API Keys** — create, list, delete
- **Provider Keys** — get, set, delete
- **Analytics** — overview, processing, fileTypes, spaces, failures, volume, trends, providers, topFailures, storageGrowth
- **Search** — query with text/vector/hybrid modes
- **Q&A** — ask questions with RAG and source citations
- `verifyWebhookSignature()` — HMAC-SHA256 webhook verification utility
- Typed variant discriminated unions: MarkdownVariant, EmbeddingsVariant, MetadataVariant, ThumbnailVariant, SearchableIndexVariant
- Typed webhook events: FileCreated, FileProcessingStarted/Completed/Failed, FileVariantReady, FileDeleted, JobCompleted/Failed, BatchCompleted, ConnectionSynced
- Full error hierarchy: NotFoundError, ForbiddenError, ValidationError, RateLimitError, QuotaExceededError, UnauthorizedError, ConflictError, TimeoutError, ServerError, ServiceUnavailableError, NetworkError
- Progress callbacks on upload via `onProgress`
- Batch upload with configurable concurrency

### Environment Support
- Node.js 18+
- Cloudflare Workers
- Deno
- Bun
