# <img src="../logo.png" width="32" height="32" align="center" /> Roset FUSE Client

Mount Roset object storage as a local disk. POSIX-compatible and optimized for ML workloads.

## Installation

```bash
# requires Rust 1.75+
cargo build --release
```

## Usage

```bash
# Mount your data
./roset-fuse /mnt/roset --api-key rk_...
```

## Features

- **Local Performance** - Intelligent read-ahead and metadata caching.
- **Multipart Writes** - High-throughput file uploads in parallel.
- **ML Ready** - Atomic write barriers ensure your checkpoints are always valid.
- **Read-Only Mode** - Use `--read-only` for interference-free training runs.

[FUSE Client Docs](https://docs.roset.dev/fuse)

## License
Apache-2.0
