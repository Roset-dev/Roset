<div align="center">
  <img src="../../logo.png" alt="Roset Logo" width="120" height="auto" />
  <h1>roset-python</h1>
  <p><strong>Python SDK for the Roset transformation engine</strong></p>

  <p>
    <a href="https://roset.dev">Website</a> •
    <a href="https://docs.roset.dev/sdk/python">Docs</a> •
    <a href="https://console.roset.dev">Console</a>
  </p>

  <p>
    <a href="https://pypi.org/project/roset/"><img src="https://img.shields.io/pypi/v/roset.svg?style=flat-square&color=black" alt="PyPI Version" /></a>
    <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square" alt="License" /></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/pypi/pyversions/roset?style=flat-square" alt="Python" /></a>
  </p>

  <p><em>🚧 In active development — API may change before 1.0</em></p>
</div>

<br />

Upload any unstructured file — get back markdown, embeddings, metadata, thumbnails, and a searchable index. The Python SDK for the Roset unstructured-to-structured transformation engine.

## Installation

```bash
pip install roset
```

## Quick Start

```python
from roset import Client

client = Client(api_key="rsk_...")

# Upload a file -- Roset routes to the right extraction provider
result = client.upload("report.pdf", space="default")
file_id = result["file"]["id"]
job_id = result["job"]["id"]

# Check processing status
job = client.jobs.get(job_id)
print(job["status"])  # "completed"

# Retrieve extracted variants
variants = client.files.list_variants(file_id)
# -> markdown, embeddings, metadata, thumbnails, searchable-index

# Get a specific variant
markdown = client.files.get_variant(file_id, "markdown")

# Cancel or retry a job
client.jobs.cancel(job_id)
client.jobs.retry(job_id)
```

## Features

| Resource | Description |
|----------|-------------|
| `upload` | Upload files -- automatic provider routing (Reducto, Gemini, Whisper) |
| `files` | List, get, delete files and retrieve variants (markdown, embeddings, metadata, thumbnails, searchable-index) |
| `jobs` | Track processing status, cancel, retry |
| `spaces` | Optional namespace scoping for B2B SaaS multi-tenancy |
| `connections` | Connect external storage providers (S3, GCS, Azure Blob, R2, MinIO, Supabase Storage) |
| `nodes` | Browse file/folder hierarchy within storage connections |
| `analytics` | Processing metrics, file-type breakdowns, failure analysis, volume trends |
| `webhooks` | Subscribe to processing lifecycle events (`job.completed`, `variant.ready`, etc.) |

## Resources

### Files

```python
# List files (with optional filters)
files = client.files.list(space="default", status="completed")

# Get a file (includes variants)
file = client.files.get("file-id")

# Delete a file and its variants
client.files.delete("file-id")

# List all variants for a file
variants = client.files.list_variants("file-id")

# Get a specific variant type
markdown = client.files.get_variant("file-id", "markdown")
embeddings = client.files.get_variant("file-id", "embeddings")
thumbnail = client.files.get_variant("file-id", "thumbnail")
metadata = client.files.get_variant("file-id", "metadata")
index = client.files.get_variant("file-id", "searchable-index")
```

### Jobs

```python
# List processing jobs
jobs = client.jobs.list(status="processing")

# Get job details
job = client.jobs.get("job-id")

# Cancel a running job
client.jobs.cancel("job-id")

# Retry a failed job
client.jobs.retry("job-id")
```

### Spaces

```python
# List all spaces
spaces = client.spaces.list()

# Get statistics for a space
stats = client.spaces.get_stats("default")
```

### Connections

```python
# Connect an S3 bucket
conn = client.connections.create(
    provider="s3",
    name="My Bucket",
    bucket="my-bucket",
    # ...provider-specific credentials
)

# List connections
connections = client.connections.list()

# Test connectivity
client.connections.test("connection-id")

# Trigger file sync
client.connections.sync("connection-id")

# Delete a connection
client.connections.delete("connection-id")
```

### Nodes

```python
# List nodes (files/folders from connected storage)
nodes = client.nodes.list(parent_id="folder-id")

# Get a node
node = client.nodes.get("node-id")

# Get a signed download URL
download = client.nodes.download("node-id")

# Delete a node
client.nodes.delete("node-id")
```

### Analytics

```python
# Organization overview
overview = client.analytics.overview()

# Processing metrics (last 30 days)
metrics = client.analytics.processing(days=30)

# File type distribution
types = client.analytics.file_types()

# Per-space statistics
spaces = client.analytics.spaces()

# Recent failures
failures = client.analytics.failures(limit=20)

# Upload volume trends
volume = client.analytics.volume(days=30)
```

### Webhooks

```python
# Create a webhook subscription
webhook = client.webhooks.create(
    url="https://example.com/webhook",
    events=["job.completed", "job.failed", "variant.ready"],
)

# List webhooks
webhooks = client.webhooks.list()

# Update a webhook
client.webhooks.update("webhook-id", events=["job.completed"])

# View delivery history
deliveries = client.webhooks.deliveries("webhook-id")

# Send a test event
client.webhooks.test("webhook-id")

# Delete a webhook
client.webhooks.delete("webhook-id")
```

## Context Manager

```python
with Client(api_key="rsk_...") as client:
    result = client.upload("data.pdf", space="default")
```

## Configuration

```python
client = Client(
    api_key="rsk_...",
    base_url="https://api.roset.dev",  # Override for local dev
    timeout=30.0,                       # Request timeout in seconds
    max_retries=3,                      # Retry on transient failures
)
```

## Error Handling

```python
from roset import Client, RosetAPIError, RosetNotFoundError, RosetRateLimitError

client = Client(api_key="rsk_...")

try:
    file = client.files.get("nonexistent-id")
except RosetNotFoundError:
    print("File not found")
except RosetRateLimitError:
    print("Rate limited -- back off and retry")
except RosetAPIError as e:
    print(f"API error {e.status_code}: {e.message}")
```

## Documentation

Full API docs at [docs.roset.dev/sdk/python](https://docs.roset.dev/sdk/python).

## License

Apache 2.0 (c) [Roset](https://roset.dev)
