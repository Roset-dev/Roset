<div align="center">
  <img src="./logo.png" alt="Roset Logo" width="120" height="auto" />
  <h1>Roset</h1>
  <p><strong>The transformation engine for unstructured data.</strong></p>

  <p>
    <a href="https://roset.dev">Website</a> •
    <a href="https://docs.roset.dev">Documentation</a> •
    <a href="https://console.roset.dev">Console</a>
  </p>

  <p>
    <a href="https://www.npmjs.com/package/@roset/sdk"><img src="https://img.shields.io/npm/v/@roset/sdk.svg?style=flat-square&color=black" alt="NPM Version" /></a>
    <a href="https://pypi.org/project/roset/"><img src="https://img.shields.io/pypi/v/roset.svg?style=flat-square&color=black" alt="PyPI Version" /></a>
    <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square" alt="License" /></a>
  </p>
</div>

<br />

Upload any document — get back markdown, embeddings, metadata, thumbnails, and a searchable index. What takes 7 weeks of plumbing to build, Roset handles in 5 minutes.

Roset doesn't compete with extraction services (Reducto, Gemini, Whisper). It **orchestrates** them — managing queues, retries, normalization, variant tracking, and a unified output schema across all file types.

## Quick Start

```typescript
import { RosetClient } from "@roset/sdk";

const roset = new RosetClient({ apiKey: process.env.ROSET_API_KEY });

// Upload a file — Roset routes to the right extraction provider
const { file_id, upload_url } = await roset.files.upload({
  filename: "report.pdf",
  content_type: "application/pdf",
  size_bytes: 102400,
});

// PUT file bytes directly to the signed URL
await fetch(upload_url, { method: "PUT", body: fileBuffer });

// Retrieve structured variants
const { variants } = await roset.files.listVariants(file_id);
// → markdown, embeddings, metadata, thumbnails, searchable-index
```

```python
from roset import RosetClient

client = RosetClient(api_key="rsk_...")

# Upload and process
result = client.files.upload(
    filename="report.pdf",
    content_type="application/pdf",
    size_bytes=102400,
)

# Get variants
variants = client.files.list_variants(result["file_id"])
```

## Features

- **Unified Upload** — `roset.files.upload(file)` handles PDFs, images, audio, DOCX, PPTX. One API for all file types.
- **5 Variant Types** — Every upload produces markdown (readable), embeddings (searchable), metadata (filterable), thumbnails (previewable), and a searchable index (queryable).
- **Multi-Provider Routing** — Automatically routes to Reducto (documents), Gemini (images), Whisper (audio), OpenAI (embeddings).
- **BYOK-First** — Bring your own extraction provider keys (Reducto, OpenAI, Gemini, Whisper). Zero markup on provider costs. Small managed trial quota included for evaluation.
- **Processing State Machine** — `uploading → queued → processing → completed / failed` with retries and dead-letter handling.
- **Search & Q&A** — Full-text, vector, and hybrid search. RAG-powered Q&A with source citations.
- **Storage Connectors** — Connect existing S3, GCS, Azure Blob, MinIO, Cloudflare R2, or Supabase Storage buckets.
- **Spaces** — Optionally scope files to namespace labels for B2B SaaS isolation (defaults to "default").
- **Webhooks** — Processing lifecycle events (file completed, variant ready, job failed).

## SDKs

| SDK | Description |
|-----|-------------|
| **[`@roset/sdk`](./sdk/typescript)** | TypeScript SDK for web, backend, and edge runtimes. |
| **[`roset`](./sdk/python)** | Python SDK for backend and automation. |

## CLI

```bash
roset upload ./report.pdf documents/report.pdf
roset search "payment terms" --mode hybrid
roset qa "What are the key findings?"
```

See [`cli/`](./cli) for installation and full command reference.

## Architecture

Roset is a **transformation engine** that sits between your storage and everything else:

1. **Upload** — Files go in unstructured (PDF, image, audio, document).
2. **Transform** — Roset routes to the right extraction provider (Reducto, Gemini, Whisper, OpenAI) and produces structured variants.
3. **Query** — Downstream systems consume the structured outputs: markdown for LLMs, embeddings for RAG, metadata for filtering, thumbnails for previews, searchable index for full-text search.

## License

Apache 2.0 © [Roset](https://roset.dev)
