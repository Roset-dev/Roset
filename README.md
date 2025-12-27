# <img src="./logo.png" width="32" height="32" align="center" /> Roset

**Filesystem semantics for object storage.**

Roset adds a metadata layer to any S3-compatible bucket (S3, R2, GCS, MinIO). Move folders instantly, manage permissions, and mount your data as a disk: while your bytes stay in your own bucket.

## Components

- **[`sdk/typescript`](./sdk/typescript)** - Modern SDK for web & backend
- **[`sdk/python`](./sdk/python)** - Python SDK with ML training integrations
- **[`cli/`](./cli)** - Management CLI for developers
- **[`fuse/`](./fuse)** - High-performance FUSE client (Rust)
- **[`csi/`](./csi)** - Kubernetes CSI driver

## Usage

```bash
# Build all components
pnpm install && pnpm build
```

## How it works

1. **Control Plane** - Roset manages the namespace (paths, folders, ACLs).
2. **Data Plane** - Clients get signed URLs to talk directly to your storage provider.
3. **Correctness** - Renames and moves are atomic O(1) metadata updates.

## Resources

- [Website](https://www.roset.dev)
- [Console](https://console.roset.dev)
- [Documentation](https://docs.roset.dev)
