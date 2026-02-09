<div align="center">
  <img src="../../logo.png" alt="Roset Logo" width="120" height="auto" />
  <h1>@roset/sdk</h1>
  <p><strong>TypeScript SDK for file processing orchestration</strong></p>

  <p>
    <a href="https://roset.dev">Website</a> •
    <a href="https://docs.roset.dev/sdk/typescript">Docs</a> •
    <a href="https://console.roset.dev">Console</a>
  </p>

  <p>
    <a href="https://www.npmjs.com/package/@roset/sdk"><img src="https://img.shields.io/npm/v/@roset/sdk.svg?style=flat-square&color=black" alt="NPM Version" /></a>
    <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square" alt="License" /></a>
  </p>
</div>

<br />

Upload any document — get back markdown, embeddings, and variants. The TypeScript SDK for the Roset file processing orchestration API.

## Installation

```bash
npm install @roset/sdk
```

## Quick Start

```typescript
import { RosetClient } from "@roset/sdk";

const roset = new RosetClient({ apiKey: process.env.ROSET_API_KEY });

// Upload a file — Roset routes to the right extraction provider
const { file_id, job_id, upload_url } = await roset.files.upload({
  filename: "report.pdf",
  content_type: "application/pdf",
  size_bytes: 102400,
});

// PUT your file bytes directly to the signed URL
await fetch(upload_url, { method: "PUT", body: fileBuffer });

// Check processing status
const job = await roset.jobs.get(job_id);
console.log(job.status); // "completed"

// Retrieve extracted variants
const { variants } = await roset.files.getVariants(file_id);
for (const v of variants) {
  console.log(`${v.type} — ${v.provider} — ${v.size_bytes} bytes`);
}
```

## Features

| Resource | Methods | Description |
|----------|---------|-------------|
| `files` | upload, list, get, delete, getVariants, process, processBatch, uploadBatch, getBatch | Upload files, retrieve variants (markdown, embeddings, thumbnails, metadata) |
| `jobs` | list, get, cancel, retry | Track processing status, cancel or retry jobs |
| `connections` | create, list, get, delete, test, sync, enumerate | Manage storage provider connections (S3, GCS, Azure, R2, MinIO, Supabase) |
| `nodes` | list, get, delete, download, upload, move, rename, listChildren, search | Browse and manipulate files/folders in connected storage |
| `webhooks` | create, list, get, update, delete, test, listDeliveries, replay, verify | Subscribe to processing lifecycle events |
| `search` | query | Full-text, vector, or hybrid search across files |
| `qa` | ask | RAG-powered Q&A with source citations |
| `spaces` | list, getStats | Optional namespace isolation for multi-tenant apps |
| `apiKeys` | create, list, delete | Create and revoke organization API keys |
| `providerKeys` | set, get, delete | Manage BYOK extraction provider credentials |
| `analytics` | overview, processing, fileTypes, spaces, failures, volume, trends, providers, topFailures, storageGrowth | Processing metrics and statistics |

## Authentication

```typescript
// API key auth (server-side)
const roset = new RosetClient({ apiKey: "rsk_..." });

// Dynamic token auth (browser with Clerk)
const roset = new RosetClient({
  getAccessToken: () => clerk.session.getToken(),
});

// Custom base URL for self-hosted or local development
const roset = new RosetClient({
  apiKey: "rsk_...",
  baseUrl: "http://localhost:8787",
});
```

## Resources

### Files

```typescript
// Upload with progress tracking
const result = await roset.files.upload({
  filename: "report.pdf",
  content_type: "application/pdf",
  size_bytes: 102400,
  space: "acme-corp",
  onProgress: (event) => console.log(event.stage), // uploading -> queued -> processing -> completed
});

// List files with filtering
const { files, next_cursor } = await roset.files.list({
  space: "acme-corp",
  status: "completed",
  limit: 50,
});

// Get a single file
const file = await roset.files.get("file-id");

// Get processing variants
const { variants } = await roset.files.getVariants("file-id");

// Trigger processing on an existing file
await roset.files.process("file-id", {
  provider: "reducto",
  variants: ["markdown", "embeddings"],
});

// Batch upload with concurrency control
const batch = await roset.files.uploadBatch(
  [
    { filename: "a.pdf", content_type: "application/pdf", size_bytes: 1024 },
    { filename: "b.pdf", content_type: "application/pdf", size_bytes: 2048 },
  ],
  { concurrency: 3 },
);
console.log(`${batch.succeeded}/${batch.total} uploaded`);

// Delete a file
await roset.files.delete("file-id");
```

### Jobs

```typescript
// List processing jobs
const { jobs } = await roset.jobs.list({ status: "failed", limit: 10 });

// Get job details
const job = await roset.jobs.get("job-id");

// Cancel an in-progress job
await roset.jobs.cancel("job-id");

// Retry a failed job
await roset.jobs.retry("job-id");
```

### Connections

```typescript
// Create an S3 connection
const conn = await roset.connections.create({
  name: "Production S3",
  provider: "s3",
  bucket_name: "my-bucket",
  region: "us-east-1",
  credentials: { access_key_id: "...", secret_access_key: "..." },
});

// Test connectivity
const { success } = await roset.connections.test(conn.id);

// Trigger a metadata sync
await roset.connections.sync(conn.id);

// List all connections
const { connections } = await roset.connections.list();

// Enumerate bucket contents
const objects = await roset.connections.enumerate(conn.id, { prefix: "documents/" });
```

### Nodes

```typescript
// List nodes in a connection
const { nodes } = await roset.nodes.list({ connection_id: "conn-id" });

// Get a signed download URL
const { url } = await roset.nodes.download("node-id");

// Upload to connected storage
const { node, upload_url } = await roset.nodes.upload("conn-id", {
  filename: "invoice.pdf",
  content_type: "application/pdf",
});

// Move and rename
await roset.nodes.move("node-id", { parent_id: "folder-id" });
await roset.nodes.rename("node-id", "new-name.pdf");

// Search nodes by name
const results = await roset.nodes.search("invoice", { connection_id: "conn-id" });
```

### Search

```typescript
// Hybrid search (default — combines full-text and vector)
const { results } = await roset.search.query({
  query: "payment terms",
  space: "contracts",
});

// Full-text search
const { results } = await roset.search.query({
  query: "quarterly revenue",
  mode: "text",
  limit: 10,
});

// Vector similarity search
const { results } = await roset.search.query({
  query: "financial obligations and liabilities",
  mode: "vector",
});
```

### Q&A

```typescript
// Ask a question with RAG-powered answers
const { answer, sources } = await roset.qa.ask({
  question: "What are the payment terms in the contract?",
  space: "contracts",
  topK: 5,
});

console.log(answer);
for (const source of sources) {
  console.log(`  - ${source.filename} (score: ${source.score})`);
}
```

### Webhooks

```typescript
// Create a webhook subscription
const webhook = await roset.webhooks.create({
  url: "https://example.com/webhooks/roset",
  events: ["file.processing.completed", "file.processing.failed"],
});

// Update events or disable
await roset.webhooks.update(webhook.id, { enabled: false });

// Send a test event
await roset.webhooks.test(webhook.id);

// Inspect delivery history
const { deliveries } = await roset.webhooks.listDeliveries(webhook.id);

// Replay events
await roset.webhooks.replay(webhook.id, {
  since: "2026-01-01T00:00:00Z",
  event_types: ["file.processing.completed"],
});
```

### Spaces

```typescript
// List all spaces
const { spaces } = await roset.spaces.list();

// Get per-space statistics
const stats = await roset.spaces.getStats("acme-corp");
```

### API Keys

```typescript
// Create a new API key
const { key } = await roset.apiKeys.create({
  name: "CI/CD Pipeline",
  mode: "live",
  scopes: ["files:read", "files:write"],
});
// Store `key` securely — it is only returned once

// List keys (values are never returned)
const { api_keys } = await roset.apiKeys.list();

// Revoke a key
await roset.apiKeys.delete("key-id");
```

### Provider Keys

```typescript
// Set a BYOK extraction provider key
await roset.providerKeys.set({ provider: "reducto", key: "rdc_..." });

// Check which providers have keys configured
const { provider_keys } = await roset.providerKeys.get();

// Remove a provider key
await roset.providerKeys.delete("reducto");
```

### Analytics

```typescript
// High-level overview
const overview = await roset.analytics.overview();

// Processing pipeline stats (last 30 days)
const processing = await roset.analytics.processing(30);

// File type breakdown, volume, trends, storage growth
const types = await roset.analytics.fileTypes();
const volume = await roset.analytics.volume(7);
const trends = await roset.analytics.trends(30);
const storage = await roset.analytics.storageGrowth(90);

// Provider utilization
const providers = await roset.analytics.providers(30);

// Failure analysis
const failures = await roset.analytics.failures(20);
const topFailures = await roset.analytics.topFailures(10);

// Per-space analytics
const spacesAnalytics = await roset.analytics.spaces();
```

## Webhook Verification

Verify incoming webhook signatures using HMAC-SHA256 (Web Crypto API, works everywhere):

```typescript
import { verifyWebhookSignature } from "@roset/sdk";

// In your webhook handler (Express, Hono, etc.)
const event = await verifyWebhookSignature(
  rawBody,                              // raw request body string
  request.headers["x-roset-signature"], // "sha256=..." header
  process.env.WEBHOOK_SECRET,           // your signing secret
);

switch (event.type) {
  case "file.processing.completed":
    console.log(`File ${event.data.file_id} processed by ${event.data.provider}`);
    break;
  case "file.processing.failed":
    console.error(`Processing failed: ${event.data.error.message}`);
    break;
  case "file.variant.ready":
    console.log(`Variant ${event.data.variant_type} ready for file ${event.data.file_id}`);
    break;
}
```

Supported webhook event types:
- `file.created`, `file.deleted`
- `file.processing.started`, `file.processing.completed`, `file.processing.failed`
- `file.variant.ready`
- `job.completed`, `job.failed`
- `batch.completed`
- `connection.synced`

## Error Handling

All API errors are mapped to typed error classes with `instanceof` support:

```typescript
import {
  RosetClient,
  RosetError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  QuotaExceededError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TimeoutError,
  ServerError,
  ServiceUnavailableError,
  NetworkError,
} from "@roset/sdk";

try {
  await roset.files.get("nonexistent-id");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.error("File not found");
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited — retry after ${err.retryAfter}s`);
  } else if (err instanceof QuotaExceededError) {
    console.error("Upgrade your plan");
  } else if (err instanceof ValidationError) {
    console.error("Invalid request:", err.details);
  } else if (err instanceof RosetError) {
    console.error(`${err.code} (${err.statusCode}): ${err.message}`);
    if (err.retryable) {
      // Safe to retry: 429, 503, 504, 5xx
    }
  }
}
```

| Status | Error Class | Retryable |
|--------|-------------|-----------|
| 400 | `ValidationError` | No |
| 401 | `UnauthorizedError` | No |
| 402 | `QuotaExceededError` | No |
| 403 | `ForbiddenError` | No |
| 404 | `NotFoundError` | No |
| 409 | `ConflictError` | No |
| 429 | `RateLimitError` | Yes |
| 500 | `ServerError` | Yes |
| 503 | `ServiceUnavailableError` | Yes |
| 504 | `TimeoutError` | Yes |
| Network | `NetworkError` | Yes |

## Environment Support

The SDK uses the Web `fetch` API and Web Crypto API with zero native dependencies, making it compatible with:

- **Node.js** 18+
- **Cloudflare Workers**
- **Deno**
- **Bun**

## Documentation

Full API docs at [docs.roset.dev/sdk/typescript](https://docs.roset.dev/sdk/typescript).

## License

Apache 2.0 © [Roset](https://roset.dev)
