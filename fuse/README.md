# <img src="../logo.png" width="32" height="32" align="center" /> Roset FUSE Client

Mount Roset object storage as a local disk. POSIX-compatible and optimized for ML workloads.

## Quick Start

The easiest way to mount Roset is via the CLI or Docker Agent.

### Option 1: CLI (macOS/Linux)
```bash
# Install CLI
go install github.com/roset-dev/roset/monorepo/cli@latest

# Mount via CLI wrapper (handles permissions automatically)
roset mount /mnt/work --api-key rk_...
```

### Option 2: Docker Agent
```bash
# Zero-install mount
docker run -d \
  --device /dev/fuse \
  --cap-add SYS_ADMIN \
  -v /mnt/work:/mnt/work:rshared \
  -e ROSET_API_KEY=rk_... \
  ghcr.io/roset-dev/roset/roset-agent:latest \
  roset-fuse /mnt/work
```

### Option 3: Build from Source
```bash
# requires Rust 1.76+
cargo install --path monorepo/fuse

# Run directly
roset-fuse /mnt/work --api-key rk_...
```

## Features

- **Local Performance** - Intelligent read-ahead and metadata caching.
- **Multipart Writes** - High-throughput file uploads in parallel.
- **ML Ready** - Atomic write barriers ensure your checkpoints are always valid.
- **Read-Only Mode** - Use `--read-only` for interference-free training runs.

[FUSE Client Docs](https://docs.roset.dev/fuse)

## License
Apache-2.0
