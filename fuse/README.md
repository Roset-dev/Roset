# Roset FUSE Client

Mount Roset-managed object storage as a local filesystem using FUSE.

## Features

- **Full Read-Write Support**: Create, write, delete files and directories.
- **Multipart Uploads**: Large files are uploaded using S3 multipart for reliability.
- **Extended Attributes**: Store custom metadata via xattrs.
- **Metadata Caching**: Configurable TTL for directory listings and file stats.
- **Graceful Shutdown**: Clean unmount on SIGINT/SIGTERM.

## Requirements

- Linux with FUSE support (or macOS with macFUSE)
- Rust 1.70+
- `libfuse3-dev` (Ubuntu/Debian) or `fuse3` (Fedora)

## Installation

```bash
# Ubuntu/Debian
sudo apt install libfuse3-dev pkg-config

# Fedora
sudo dnf install fuse3-devel

# Build
cargo build --release
```

## Usage

```bash
# Mount
./target/release/roset-fuse /mnt/roset \
  --api-key rsk_live_... \
  --api-url https://api.roset.dev

# With debug logging
roset-fuse /mnt/roset --api-key $ROSET_API_KEY --debug

# Read-only mode (optional)
roset-fuse /mnt/roset --api-key $ROSET_API_KEY --read-only

# Specific mount
roset-fuse /mnt/roset --api-key $ROSET_API_KEY --mount-id <uuid>

# Unmount
fusermount -u /mnt/roset   # Linux
umount /mnt/roset          # macOS
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ROSET_API_URL` | Roset API base URL |
| `ROSET_API_KEY` | API key for authentication |
| `ROSET_MOUNT_ID` | Optional mount ID |

## Options

```
--api-url       Roset API base URL [default: https://api.roset.dev]
--api-key       Roset API key (required)
--mount-id      Specific mount ID (uses default if omitted)
--foreground    Don't daemonize
--debug         Enable debug logging
--cache-ttl     Metadata cache TTL in seconds [default: 300]
--cache-size-mb Read cache size in MB [default: 256]
--allow-other   Allow other users to access mount
--read-only     Mount as read-only
```

## Supported Operations

| Operation | Status |
|-----------|--------|
| `lookup` | ✅ |
| `getattr` | ✅ |
| `readdir` | ✅ |
| `open` | ✅ |
| `read` | ✅ |
| `create` | ✅ |
| `write` | ✅ |
| `mkdir` | ✅ |
| `rmdir` | ✅ |
| `unlink` | ✅ |
| `release` (flush + upload) | ✅ |
| `setxattr` | ✅ |
| `getxattr` | ✅ |
| `listxattr` | ✅ |
| `removexattr` | ✅ |

## Architecture

```
┌──────────────────────────────────────┐
│        ML Training Script            │
│   (open, read, write, readdir, ...)  │
└────────────────┬─────────────────────┘
                 │ POSIX
                 ▼
┌──────────────────────────────────────┐
│          roset-fuse Daemon           │
│  ┌─────────┐  ┌─────┐  ┌──────────┐  │
│  │  FUSE   │  │Cache│  │API Client│  │
│  └─────────┘  └─────┘  └──────────┘  │
│        │         │                   │
│  ┌─────────────────────────────────┐ │
│  │       Staging Manager           │ │
│  │  (buffered writes → multipart)  │ │
│  └─────────────────────────────────┘ │
└────────────────┬─────────────────────┘
                 │ HTTPS
                 ▼
┌──────────────────────────────────────┐
│        Roset Control Plane           │
└────────────────┬─────────────────────┘
                 │ Signed URLs
                 ▼
┌──────────────────────────────────────┐
│            S3 / R2 / MinIO           │
└──────────────────────────────────────┘
```

## License

Apache-2.0
