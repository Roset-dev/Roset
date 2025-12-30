# FUSE Client Architecture

> Design principles and implementation details for the Roset FUSE filesystem client

## Overview

The FUSE client allows mounting Roset-managed object storage as a local POSIX-compatible filesystem. Optimized for ML workloads with intelligent caching, atomic checkpoints, and high-throughput parallel uploads.

```mermaid
graph TB
    subgraph "User Space"
        APP[Application]
        FUSE[FUSE Kernel Module]
    end
    
    subgraph "roset-fuse Process"
        FS[RosetFs]
        INODE[InodeMap]
        CACHE[Cache]
        STAGING[StagingManager]
        CLIENT[RosetClient]
    end
    
    subgraph "Remote"
        API[Roset API]
        S3[Object Storage]
    end
    
    APP -->|syscalls| FUSE
    FUSE -->|libfuse| FS
    FS --> INODE
    FS --> CACHE
    FS --> STAGING
    FS --> CLIENT
    CLIENT -->|HTTPS| API
    CLIENT -->|Signed URLs| S3
    STAGING -->|Background| CLIENT
```

---

## Core Components

### 1. RosetFs (`fs.rs`)

The main FUSE filesystem implementation. Implements `fuser::Filesystem` trait with 30+ POSIX operations:

| Operation | Description |
|-----------|-------------|
| `lookup` | Resolve name in directory |
| `getattr` | Get file/folder attributes |
| `readdir` | List directory contents |
| `open` / `read` | Read file data |
| `create` / `write` / `release` | Create and write files |
| `mkdir` / `rmdir` / `unlink` | Directory and file deletion |
| `rename` | Move/rename (O(1) metadata op) |
| `setattr` | Truncate, update timestamps |

**Key Design Decisions:**

```rust
pub struct RosetFs {
    client: Arc<RosetClient>,      // API client
    inodes: InodeMap,              // UUID ↔ inode mapping
    cache: Cache,                  // Metadata + directory cache
    rt: Runtime,                   // Tokio runtime for async
    handles: Mutex<HashMap<...>>,  // Open file handles
    staging_manager: Option<...>,  // Background uploads
    read_only: bool,               // Read-only mode flag
}
```

**Sync→Async Bridge:**

> [!NOTE]
> FUSE callbacks are synchronous, so we use `rt.block_on()` to bridge to async API calls. Each operation completes within a single blocking call.

**Known Limitation:** Under heavy load (100+ concurrent ops), `block_on()` per syscall can become a bottleneck:
- Head-of-line blocking when slow API calls stall FUSE worker threads
- Poor parallelism for `readdir`/`stat` storms
- Risk of lock contention with runtime

**Upgrade Path (v2):** Move to a worker pool + channel model:
```rust
// Future architecture
pub struct RosetFsV2 {
    op_sender: mpsc::Sender<FuseOp>,      // Enqueue ops
    workers: Vec<JoinHandle<()>>,          // Async task pool
    timeout: Duration,                     // Per-op timeout (30s default)
}
```

---

### 2. InodeMap (`inode.rs`)

Maps Roset UUIDs to 64-bit FUSE inodes:

```rust
pub struct InodeMap {
    next_ino: AtomicU64,              // Counter (starts at 2)
    node_to_ino: RwLock<HashMap<...>>, // UUID → inode
    ino_to_node: RwLock<HashMap<...>>, // inode → UUID
    refcounts: RwLock<HashMap<...>>,   // Inode refcounts
}
```

**Rules:**
- Root inode is always `1` (FUSE convention)
- Inodes are allocated lazily on first access
- Reference counting for `forget()` callback cleanup

---

### 3. Cache (`cache.rs`)

LRU cache with TTL for metadata and directory listings:

| Cache | Purpose | Size | Policy |
|-------|---------|------|--------|
| `nodes` | Node metadata | 10,000 | Mutable (TTL) or Immutable |
| `children` | Directory listings | 1,000 | Mutable (TTL) or Immutable |
| `parents` | Reverse lookups | 10,000 | Invalidate on mutation |
| `negative` | "Not found" results | 5,000 | TTL (60s) |

**Cache Policies:**

```rust
pub enum CachePolicy {
    Mutable(Duration),  // Expires after TTL
    Immutable,          // Never expires (committed snapshots)
}
```

> [!TIP]
> **Committed directories** (ML checkpoints) are cached as `Immutable` — they never change, so no TTL is needed.

#### Cache Coherence Rules

| Mutation | Cache Invalidation |
|----------|-------------------|
| `create` | Invalidate parent's `children`; add to `nodes` |
| `unlink` / `rmdir` | Remove from `nodes`/`children`; invalidate parent |
| `rename` | Invalidate old+new parent `children`; update `parents` |
| `setattr` | Update `nodes` entry in-place |
| API returns `dirVersion` | Compare with cached; evict if stale |

**Directory Version Stamps:**
- Server returns `dirVersion: u64` on directory fetches
- Client stores version with cached children
- On mutation, bump local version optimistically
- Background refresh compares versions

---

### 4. RosetClient (`client.rs`)

HTTP client for Roset API with typed errors:

```rust
pub enum ApiError {
    NotFound,           // → ENOENT
    Unauthorized,       // → EACCES
    Forbidden,          // → EACCES
    LeaseConflict,      // → EBUSY
    RateLimited,        // → EAGAIN
    ServerError(String),
    NetworkError(...),
}
```

**API Endpoints Used:**

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/resolve` | Path → Node lookup |
| `GET /v1/nodes/:id` | Get node by ID |
| `GET /v1/nodes/:id/children` | List children |
| `GET /v1/nodes/:id/download` | Get signed download URL |
| `GET /v1/nodes/:id/manifest` | Get immutable manifest |
| `POST /v1/nodes` | Create file/folder |
| `PATCH /v1/nodes/:id` | Rename/move |
| `DELETE /v1/nodes/:id` | Soft delete |
| `POST /v1/uploads/init` | Start upload |
| `POST /v1/uploads/:token/part` | Get part URL |
| `POST /v1/uploads/:token/complete` | Finalize multipart |

#### Signed URL Lifecycle

```rust
pub struct FileHandle {
    node_id: Uuid,
    signed_url: String,
    expires_at: SystemTime,    // URL expiry timestamp
    refresh_buffer: Duration,  // 5 min before expiry
}
```

**Refresh Strategy:**
1. Store `expiresAt` with each signed URL (parsed from response)
2. Before each read, check: `now + refresh_buffer > expires_at`
3. If near expiry, proactively fetch new URL
4. On HTTP 403 during read, retry once with fresh URL
5. Log URL refresh events for debugging

---

### 5. StagingManager (`staging.rs`)

Background multipart upload with crash recovery:

```mermaid
sequenceDiagram
    participant App
    participant FUSE
    participant Staging
    participant API
    participant S3

    App->>FUSE: write() + close()
    FUSE->>Staging: stage_file(temp, token)
    FUSE-->>App: OK (fast return)
    
    loop Background
        Staging->>API: get_upload_part_url(n)
        API-->>Staging: signed URL
        Staging->>S3: PUT chunk
        S3-->>Staging: ETag
        Staging->>Staging: persist progress
    end
    
    Staging->>API: complete_multipart(parts)
    Staging->>Staging: cleanup files
```

**Crash Recovery:**
1. Job metadata saved to `.job.json` files
2. On startup, scan staging directory for incomplete jobs
3. Resume uploads from last completed part
4. Failed jobs moved to `staging/failed/` (dead letter queue)

**Tuning:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `PART_SIZE` | 20 MB | Chunk size for multipart |
| `CONCURRENCY` | 5 | Parallel part uploads |
| `max_attempts` | 5 | Retries per job |

---

## Durability & Consistency

### Durability Modes

| Mode | Flag | `close()` Behavior | Data Safety |
|------|------|-------------------|-------------|
| **Sync** (default) | none | Blocks until upload complete | ✅ Durable on return |
| **Async** | `--write-back-cache` | Returns after staging | ⚠️ At-risk until background upload |
| **Sync-on-fsync** | `--durability=sync-on-fsync` | `close()` fast, `fsync()` blocks | ✅ Explicit durability point |

### POSIX Durability Semantics

| Operation | Behavior |
|-----------|----------|
| `write()` | Buffered to temp file (always fast) |
| `close()` | Depends on durability mode (see above) |
| `fsync()` | **Blocks until uploaded + committed to API** |
| `flush()` | Same as `fsync()` — ensures data reaches remote |

> [!IMPORTANT]
> For **ML checkpoints**, use `fsync()` after writing to guarantee durability. Training frameworks (PyTorch, JAX) typically call `fsync()` after saving checkpoints.

### Staging File Safety

```bash
# Staging directory structure
staging/
├── pending/
│   ├── abc123.data      # Temp file data
│   └── abc123.job.json  # Upload metadata (fsync'd)
└── failed/              # Dead letter queue
```

**Guarantees:**
- `.job.json` is `fsync()`'d before `close()` returns
- Temp data file is `fsync()`'d before upload starts
- On crash, jobs in `pending/` are resumed
- Jobs exceeding `max_attempts` moved to `failed/`

> [!CAUTION]
> With `--write-back-cache`, data loss is possible if the machine crashes before upload completes. The staging directory **must** be on a persistent filesystem (not tmpfs).

---

## POSIX Semantics Contract

| Feature | Status | Notes |
|---------|--------|-------|
| `open` / `read` / `write` / `close` | ✅ Supported | Full streaming support |
| `readdir` / `lookup` | ✅ Supported | Cached with TTL |
| `mkdir` / `rmdir` / `unlink` | ✅ Supported | Soft delete on remote |
| `rename` | ✅ Supported | O(1) metadata operation |
| `truncate` / `ftruncate` | ✅ Supported | Via `setattr` |
| `fsync` / `fdatasync` | ✅ Supported | Blocks until durable |
| `chmod` / `chown` | 🟡 Partial | Stored in metadata, not enforced |
| `atime` / `mtime` | 🟡 Partial | `mtime` preserved; `atime` not tracked |
| `symlinks` | ❌ Not supported | Use path references |
| `hardlinks` | ❌ Not supported | Object storage limitation |
| `xattr` | ❌ Not yet | Planned: map to node metadata |
| `flock` / `fcntl` locks | ❌ Not supported | Use Roset leases instead |
| `mmap` | 🟡 Partial | Works via `direct_io`; no page cache coherence |
| `fallocate` | ❌ Not supported | Pre-allocation not meaningful for objects |
| `statfs` | ✅ Supported | Returns mount quota info |

> [!WARNING]
> Applications relying on **file locking** should use Roset's lease API (`POST /v1/leases`) for distributed coordination instead of POSIX locks.

---

## Failure Modes

| Failure | Detection | Recovery | User Impact |
|---------|-----------|----------|-------------|
| **Token expiry** | 401 on API call | Auto-refresh if refresh token available; else `EACCES` | Re-auth required |
| **Signed URL expiry** | 403 on S3 read | Retry with fresh URL (see Signed URL Lifecycle) | Transparent retry |
| **Partial upload** | Job in staging with incomplete parts | Resume from last ETag on restart | Data safe in staging |
| **Rename race** | 409 Conflict from API | Return `EBUSY`; app should retry | Short retry loop |
| **Staging corruption** | Checksum mismatch on resume | Move to `failed/`, log alert | Manual intervention |
| **Network timeout** | reqwest timeout (30s default) | Retry with backoff (3 attempts) | Returns `EIO` after exhaustion |
| **Rate limit** | 429 from API | Backoff per `Retry-After` header | Returns `EAGAIN` |
| **Server error** | 5xx from API | Retry with exponential backoff | Returns `EIO` after exhaustion |

---

## Configuration (`config.rs`)

CLI powered by `clap` with env fallbacks:

```bash
roset-fuse /mnt/data \
  --api-key rk_... \
  --mount-id mount_abc \
  --cache-ttl 300 \
  --cache-size-mb 256 \
  --write-back-cache \
  --durability sync-on-fsync \
  --allow-other \
  --read-only
```

| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| `--api-key` | `ROSET_API_KEY` | required | API key |
| `--mount-id` | `ROSET_MOUNT_ID` | default | Storage mount |
| `--cache-ttl` | — | 300s | Metadata cache TTL |
| `--cache-size-mb` | — | 256 | Read cache size |
| `--write-back-cache` | — | off | Enable background uploads |
| `--durability` | — | `sync` | `sync` / `async` / `sync-on-fsync` |
| `--staging-dir` | `ROSET_STAGING_DIR` | `.roset/staging` | Staging path |
| `--allow-other` | — | off | Allow other users |
| `--read-only` | — | off | Read-only mount |
| `--url-refresh-buffer` | — | 300s | Refresh signed URLs this many seconds before expiry |

---

## Read Path

```mermaid
sequenceDiagram
    participant App
    participant FUSE
    participant Cache
    participant API
    participant S3

    App->>FUSE: open(path)
    FUSE->>Cache: get_node(id)?
    alt Cache Hit
        Cache-->>FUSE: Node
    else Cache Miss
        FUSE->>API: GET /nodes/:id/download
        API-->>FUSE: signed URL + size + expiresAt
    end
    FUSE-->>App: fd
    
    App->>FUSE: read(fd, offset, size)
    FUSE->>FUSE: check URL expiry
    alt URL valid
        FUSE->>S3: GET Range: bytes=offset-end
    else URL expiring soon
        FUSE->>API: refresh signed URL
        FUSE->>S3: GET Range: bytes=offset-end
    end
    S3-->>FUSE: data
    FUSE-->>App: data
```

**Optimizations:**
- Signed URLs cached in file handle with `expiresAt`
- Proactive refresh 5 min before expiry
- Range requests for partial reads
- Retry with exponential backoff on transient errors
- Retry-on-403 with fresh URL

---

## Write Path

```mermaid
sequenceDiagram
    participant App
    participant FUSE
    participant TempFile
    participant Staging
    participant API

    App->>FUSE: create(name)
    FUSE->>API: POST /uploads/init
    API-->>FUSE: uploadToken, nodeId
    FUSE->>TempFile: create
    FUSE-->>App: fd
    
    App->>FUSE: write(data)
    FUSE->>TempFile: append
    FUSE-->>App: OK
    
    App->>FUSE: close(fd)
    alt Durability: sync
        FUSE->>API: multipart upload (blocking)
        FUSE-->>App: OK (durable)
    else Durability: async
        FUSE->>Staging: stage_file(temp)
        FUSE-->>App: OK (fast, at-risk)
    else Durability: sync-on-fsync
        FUSE->>Staging: stage_file(temp)
        FUSE-->>App: OK (fast)
        Note over App,FUSE: App calls fsync()
        App->>FUSE: fsync(fd)
        FUSE->>Staging: wait_for_upload(token)
        FUSE-->>App: OK (durable)
    end
```

**Write-back caching:**
- Writes go to temp file, not directly to API
- On `close()`, file is moved to staging queue
- Background worker uploads in parallel
- App sees fast close, durability is eventual

---

## Error Mapping

API errors are mapped to POSIX errno:

| API Error | errno | Meaning |
|-----------|-------|---------|
| `NotFound` | `ENOENT` | No such file |
| `Unauthorized` | `EACCES` | Permission denied |
| `Forbidden` | `EACCES` | Permission denied |
| `LeaseConflict` | `EBUSY` | Resource busy |
| `RateLimited` | `EAGAIN` | Try again |
| `Conflict` | `EEXIST` | File exists (for create) or `EBUSY` (for rename) |
| `ServerError` | `EIO` | I/O error |
| `NetworkError` | `EIO` | I/O error |
| `Timeout` | `ETIMEDOUT` | Operation timed out |

---

## Dependencies

```toml
[dependencies]
fuser = "0.14"           # FUSE bindings
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json", "rustls-tls", "stream"] }
clap = { version = "4", features = ["derive", "env"] }
lru = "0.12"             # LRU cache
parking_lot = "0.12"     # Fast synchronization
tracing = "0.1"          # Structured logging
anyhow = "1"             # Error handling
thiserror = "1"          # Error derive
tempfile = "3"           # Temp files for writes
```

---

## File Structure

```
fuse/
├── Cargo.toml
├── README.md
└── src/
    ├── main.rs      # Entry point, signal handling
    ├── config.rs    # CLI parsing (clap)
    ├── fs.rs        # FUSE operations (fuser::Filesystem)
    ├── client.rs    # Roset API client
    ├── cache.rs     # LRU metadata cache
    ├── inode.rs     # UUID ↔ inode mapping
    └── staging.rs   # Background upload worker
```

---

## Platform Support

| Platform | Status |
|----------|--------|
| Linux | ✅ Full support |
| macOS | ✅ Via macFUSE |
| Windows | ❌ Not supported (no FUSE) |

---

## Roadmap

### P0 — Ship Blockers
1. **Signed URL refresh** — Implement `expiresAt` tracking + proactive refresh
2. **`fsync()` durability** — Block until upload committed for checkpoint safety

### P1 — Performance
3. **Read-ahead buffer** — Prefetch next 2 chunks for sequential reads (2x throughput for large files)
4. **Negative lookup cache** — Cache "file not found" for 60s to avoid repeated API calls
5. **Worker pool model** — Replace `block_on()` with async task pool for high concurrency

### P2 — Features
6. **Lease integration** — Acquire leases before writes for conflict prevention
7. **Extended attributes** — Map `metadata` field to xattr (`user.*` namespace)
8. **Kernel page cache** — Enable `direct_io` opt-out for better sequential read performance

### P3 — Observability
9. **Metrics export** — Prometheus endpoint for cache hit rate, upload latency, error counts
10. **Structured tracing** — OpenTelemetry spans for debugging slow operations
