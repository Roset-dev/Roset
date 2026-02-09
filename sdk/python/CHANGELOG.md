# <img src="../../logo.png" width="32" height="32" align="center" /> Roset Python SDK Changelog

All notable changes to the Roset Python SDK are documented here. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-08

### Added
- **Connections API**: `client.connections.create()`, `.list()`, `.get()`, `.delete()`, `.test()`, `.sync()` for managing storage provider integrations (S3, GCS, Azure Blob, R2, MinIO, Supabase Storage).
- **Nodes API**: `client.nodes.list()`, `.get()`, `.delete()`, `.download()` for browsing file/folder hierarchies within connected storage.
- **Analytics API**: `client.analytics.overview()`, `.processing()`, `.file_types()`, `.spaces()`, `.failures()`, `.volume()` for processing metrics and usage insights.
- **Webhooks API**: `client.webhooks.create()`, `.list()`, `.get()`, `.update()`, `.delete()`, `.deliveries()`, `.test()` for processing lifecycle event subscriptions.
- Expanded variant types: `searchable-index` added alongside `markdown`, `embeddings`, `thumbnail`, and `metadata`.

### Changed
- Updated README to document all SDK resources with usage examples.
- Updated pyproject.toml description and keywords to reflect transformation engine positioning.

---

## [0.2.0] - 2026-02-06

### Rewrite for File Processing Orchestration

Complete SDK rewrite aligned with Roset's file processing orchestration API.

### Added
- **Upload API**: `client.upload(file, space=...)` with automatic provider routing (Reducto, Gemini, Whisper, OpenAI).
- **Files API**: `client.files.list()`, `client.files.get()`, `client.files.delete()` for file management.
- **Jobs API**: `client.jobs.list()`, `client.jobs.get()`, `client.jobs.cancel()`, `client.jobs.retry()` for processing lifecycle.
- **Variants API**: `client.files.variants(file_id)` to retrieve extracted markdown, embeddings, thumbnails, and metadata.
- **Spaces API**: `client.spaces.list()`, `client.spaces.stats()` for multi-space file scoping.
- **Provider Keys API**: `client.provider_keys.set()`, `client.provider_keys.get()`, `client.provider_keys.delete()` for BYOK management.
- **Async Client**: `AsyncRoset` with full async/await support.
- Built-in retry logic with jitter and exponential backoff.

### Removed
- Filesystem semantics (nodes, commits, refs) — replaced by files/jobs/variants model.
- ML framework integrations (PyTorch Lightning, HuggingFace, Ray Train) — deferred to future release.
- Checkpoint safety contract — not applicable to processing orchestration model.

---

## [0.1.0] - 2025-12-26 (Legacy — pre-pivot)

> This release targeted the original "workflow control plane for object storage" direction, which has been superseded by file processing orchestration. The APIs below are no longer supported.

### Added (Core)
- Filesystem semantics on object storage (create, resolve, move, delete).
- Atomic commits with backend write-sealing.
- Commit groups for multi-folder atomic updates.
- Symbolic refs (atomic pointers).

### Added (Integrations)
- PyTorch Lightning `RosetCheckpointIO`.
- HuggingFace `RosetTrainerCallback`.
- Ray Train `RosetRayTrainCallback`.

[0.3.0]: https://github.com/roset-dev/roset/releases/tag/python-v0.3.0
[0.2.0]: https://github.com/roset-dev/roset/releases/tag/python-v0.2.0
[0.1.0]: https://github.com/roset-dev/roset/releases/tag/python-v0.1.0
