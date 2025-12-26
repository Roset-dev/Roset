# <img src="./core/apps/docs/public/logos/logo-white.png" width="32" height="32" align="center" /> Roset

**The filesystem for object storage.**

Roset provides filesystem semantics (folders, atomic moves, permissions) on top of any object storage (S3, Google Cloud Storage, Azure Blob, R2, MinIO, etc.).

## What's in this repo?

This is the **public open-source** monorepo for Roset. It contains:

- **`core/packages/sdk`** - TypeScript SDK for interacting with Roset
- **`core/apps/docs`** - Documentation site
- **`fuse/`** - FUSE client for mounting Roset as a filesystem

## Getting Started

```bash
# Install dependencies
pnpm install

# Run docs site
pnpm dev --filter docs

# Build SDK
pnpm build --filter @roset/sdk

# Build UI library
pnpm build --filter @roset/ui
```

## Documentation

Visit our [documentation site](https://docs.roset.dev) (coming soon) for:
- **Quickstart guides**
- **API reference**
- **SDK documentation**
- **FUSE client setup**

## Architecture

Roset wraps object storage with a metadata layer that provides:

- **Real folders** - Not simulated with prefixes
- **Atomic operations** - Move/rename without copying bytes
- **Access control** - Inherited permissions
- **Versioning** - Track file history
- **POSIX-like interface** - Mount with FUSE

## Packages

### [@roset/sdk](./core/packages/sdk)

TypeScript SDK for interacting with the Roset API.

```typescript
import { RosetClient } from '@roset/sdk';

const client = new RosetClient({
  baseUrl: 'https://api.roset.dev',
  apiKey: 'rk_...'
});

const file = await client.uploads.upload('/documents/report.pdf', buffer);
```

### [FUSE Client](./fuse)

Mount Roset as a local filesystem.

```bash
roset-fuse mount /mnt/roset --api-key rk_...
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) - See LICENSE file for details.

## Links

- **Website**: [roset.dev](https://roset.dev) (coming soon)
- **Documentation**: [docs.roset.dev](https://docs.roset.dev) (coming soon)
- **Issues**: [GitHub Issues](https://github.com/your-org/roset/issues)
